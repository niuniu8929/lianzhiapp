import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, FlatList, StyleSheet, Text, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Project, Transaction, ProjectType, DeliveryRecord } from '@/types';
import { ProjectStorage, TransactionStorage, DeliveryRecordStorage } from '@/utils/storage';
import { formatCurrency, formatDate, calculateProjectStats } from '@/utils/helpers';
import { ProjectStatusNames, InvoiceStatusNames, ProjectTypeNames } from '@/types';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StatsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [projectStats, setProjectStats] = useState<Map<string, { totalIncome: number; totalExpense: number; netProfit: number }>>(new Map());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  
  const [deliveryRecordProjectId, setDeliveryRecordProjectId] = useState<string | null>(null);
  const [deliveryRecordSelectorVisible, setDeliveryRecordSelectorVisible] = useState(false);

  const loadData = useCallback(async () => {
    const projectData = await ProjectStorage.getAll();
    const transactionData = await TransactionStorage.getAll();
    const deliveryRecordsData = await DeliveryRecordStorage.getAll();

    const statsMap = new Map<string, { totalIncome: number; totalExpense: number; netProfit: number }>();

    for (const project of projectData) {
      const stats = await calculateProjectStats(project);
      statsMap.set(project.id, {
        totalIncome: stats.totalIncome,
        totalExpense: stats.totalExpense,
        netProfit: stats.netProfit,
      });
    }

    setProjects(projectData);
    setTransactions(transactionData);
    setDeliveryRecords(deliveryRecordsData);
    setProjectStats(statsMap);
  }, []);

  const getDeliveryTotalAmount = useCallback((projectId: string) => {
    const records = deliveryRecords.filter(r => r.projectId === projectId);
    return records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [deliveryRecords]);

  const getDeliveryInvoicedAmount = useCallback((projectId: string) => {
    const records = deliveryRecords.filter(r => r.projectId === projectId);
    return records.reduce((sum, r) => sum + (Number(r.invoiceAmount) || 0), 0);
  }, [deliveryRecords]);

  const getDeliveryReceivedAmount = useCallback((projectId: string) => {
    const records = deliveryRecords.filter(r => r.projectId === projectId);
    return records.reduce((sum, r) => sum + (Number(r.receivedAmount) || 0), 0);
  }, [deliveryRecords]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredProjects = useMemo(() => {
    if (!selectedProjectId) return projects;
    return projects.filter(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const filteredTransactions = useMemo(() => {
    if (!selectedProjectId) return transactions;
    return transactions.filter(t => t.projectId === selectedProjectId);
  }, [transactions, selectedProjectId]);

  const deliveryProjects = useMemo(() => {
    return projects.filter(p => p.projectType === 'delivery');
  }, [projects]);

  // ========== 新增：应收账款追踪数据 ==========
  const receivablesData = useMemo(() => {
    const items: Array<{
      projectId: string;
      projectName: string;
      projectType: string;
      totalAmount: number;
      receivedAmount: number;
      unreceivedAmount: number;
      progress: number;
    }> = [];

    // 工程项目
    projects.filter(p => p.projectType === 'contract' || !p.projectType).forEach(project => {
      const totalAmount = project.settlementAmount || project.contractAmount || 0;
      const receivedAmount = project.receivedAmount || 0;
      const unreceivedAmount = totalAmount - receivedAmount;
      
      if (unreceivedAmount > 0) {
        items.push({
          projectId: project.id,
          projectName: project.name,
          projectType: 'contract',
          totalAmount,
          receivedAmount,
          unreceivedAmount,
          progress: totalAmount > 0 ? (receivedAmount / totalAmount) * 100 : 0,
        });
      }
    });

    // 零星采购
    deliveryProjects.forEach(project => {
      const totalAmount = getDeliveryTotalAmount(project.id);
      const receivedAmount = getDeliveryReceivedAmount(project.id);
      const unreceivedAmount = totalAmount - receivedAmount;
      
      if (unreceivedAmount > 0) {
        items.push({
          projectId: project.id,
          projectName: project.name,
          projectType: 'delivery',
          totalAmount,
          receivedAmount,
          unreceivedAmount,
          progress: totalAmount > 0 ? (receivedAmount / totalAmount) * 100 : 0,
        });
      }
    });

    // 按未收款金额降序排序
    return items.sort((a, b) => b.unreceivedAmount - a.unreceivedAmount);
  }, [projects, deliveryProjects, getDeliveryTotalAmount, getDeliveryReceivedAmount]);

  // 总待收款金额
  const totalUnreceived = useMemo(() => {
    return receivablesData.reduce((sum, item) => sum + item.unreceivedAmount, 0);
  }, [receivablesData]);

  // ========== 新增：项目利润排行榜 ==========
  const profitRanking = useMemo(() => {
    const items: Array<{
      projectId: string;
      projectName: string;
      projectType: string;
      status: string;
      totalAmount: number;
      totalExpense: number;
      netProfit: number;
      profitRate: number;
    }> = [];

    projects.forEach(project => {
      const stats = projectStats.get(project.id);
      if (!stats) return;

      let totalAmount = 0;
      if (project.projectType === 'delivery') {
        totalAmount = getDeliveryTotalAmount(project.id);
      } else {
        totalAmount = project.settlementAmount || project.contractAmount || 0;
      }

      // 零星采购使用送货记录的收款金额计算利润
      const netProfit = project.projectType === 'delivery' 
        ? getDeliveryReceivedAmount(project.id) - stats.totalExpense 
        : stats.netProfit;
      const profitRate = totalAmount > 0 ? (netProfit / totalAmount) * 100 : 0;

      items.push({
        projectId: project.id,
        projectName: project.name,
        projectType: project.projectType || 'contract',
        status: project.status,
        totalAmount,
        totalExpense: stats.totalExpense,
        netProfit,
        profitRate,
      });
    });

    // 按净利润降序排序
    return items.sort((a, b) => b.netProfit - a.netProfit);
  }, [projects, projectStats, getDeliveryTotalAmount, getDeliveryReceivedAmount]);

  // 原有的送货开票收款汇总
  const deliveryInvoicePaymentSummary = useMemo(() => {
    const projectIds = new Set<string>();
    deliveryRecords.forEach(r => {
      projectIds.add(r.projectId);
    });

    const targetProjectIds = deliveryRecordProjectId 
      ? [deliveryRecordProjectId] 
      : Array.from(projectIds);

    return targetProjectIds.map(projectId => {
      const projectRecords = deliveryRecords.filter(r => r.projectId === projectId);
      const project = projects.find(p => p.id === projectId);
      
      return {
        projectId,
        projectName: project?.name || '未知项目',
        totalAmount: projectRecords.reduce((sum, r) => sum + (r.amount || 0), 0),
        invoiceAmount: projectRecords.reduce((sum, r) => sum + (r.invoiceAmount || 0), 0),
        receivedAmount: projectRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0),
        recordCount: projectRecords.length,
      };
    });
  }, [deliveryRecords, deliveryRecordProjectId, projects]);

  // 合同项目统计
  const contractProjects = filteredProjects.filter(p => p.projectType === 'contract' || !p.projectType);
  const contractTotalIncome = contractProjects.reduce((sum, p) => sum + p.receivedAmount, 0);
  const contractTotalExpense = Array.from(projectStats.entries())
    .filter(([id]) => contractProjects.some(p => p.id === id))
    .reduce((sum, [_, s]) => sum + s.totalExpense, 0);
  const contractTotalUnpaid = contractProjects.reduce((sum, p) => {
    const totalAmount = p.settlementAmount || p.contractAmount || 0;
    return sum + (totalAmount - p.receivedAmount);
  }, 0);

  const totalAmount = useMemo(() => {
    return projects.reduce((sum, p) => {
      if (p.projectType === 'contract' || !p.projectType) {
        return sum + (p.contractAmount || 0);
      }
      if (p.projectType === 'delivery') {
        const records = deliveryRecords.filter(r => r.projectId === p.id);
        const deliveryTotal = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        return sum + deliveryTotal;
      }
      return sum;
    }, 0);
  }, [projects, deliveryRecords]);

  const projectCounts = useMemo(() => {
    const contractCount = projects.filter(p => p.projectType === 'contract' || !p.projectType).length;
    const deliveryCount = projects.filter(p => p.projectType === 'delivery').length;
    return { contractCount, deliveryCount };
  }, [projects]);

  const deliveryStatsProjects = filteredProjects.filter(p => p.projectType === 'delivery');
  const deliveryTotalAmountVal = deliveryStatsProjects.reduce((sum, p) => sum + getDeliveryTotalAmount(p.id), 0);
  const deliveryTotalInvoiced = deliveryStatsProjects.reduce((sum, p) => sum + getDeliveryInvoicedAmount(p.id), 0);
  const deliveryTotalIncome = deliveryStatsProjects.reduce((sum, p) => sum + getDeliveryReceivedAmount(p.id), 0);
  const deliveryTotalUnpaid = deliveryTotalAmountVal - deliveryTotalIncome;

  const totalIncome = contractTotalIncome + deliveryTotalIncome;
  const totalExpense = Array.from(projectStats.entries())
    .filter(([id]) => !selectedProjectId || id === selectedProjectId)
    .reduce((sum, [_, s]) => sum + s.totalExpense, 0);
  const totalNetProfit = totalIncome - totalExpense;
  const totalUnpaid = contractTotalUnpaid + deliveryTotalUnpaid;

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.success;
      case 'completed': return theme.primary;
      case 'paused': return theme.textMuted;
      default: return theme.textMuted;
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || '未知项目';
  };

  // 进度条颜色
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return theme.success;
    if (progress >= 50) return '#F59E0B';
    if (progress >= 30) return '#F97316';
    return theme.error;
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        <View style={styles.header}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.textPrimary }}>统计概览</Text>
          {projects.length > 0 && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowProjectSelector(true)}
            >
              <FontAwesome6 name="filter" size={18} color={theme.primary} />
              <Text style={{ fontSize: 14, color: theme.primary, marginLeft: 4 }}>
                {selectedProject ? selectedProject.name : '全部项目'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 总金额 */}
          <ThemedView level="default" style={styles.totalAmountCard}>
            <View style={styles.totalAmountContent}>
              <View style={styles.totalAmountIconContainer}>
                <FontAwesome6 name="sack-dollar" size={28} color={theme.primary} />
              </View>
              <View style={styles.totalAmountInfo}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>总金额</Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.primary }}>
                  ¥{totalAmount.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>
                  工程项目 {projectCounts.contractCount} 个 · 零星采购 {projectCounts.deliveryCount} 个
                </Text>
              </View>
            </View>
          </ThemedView>

          {/* 总体概况 */}
          <ThemedView level="default" style={styles.overviewCard}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginBottom: 16 }}>
              {selectedProject ? `${selectedProject.name} - 概况` : '总体概况'}
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <FontAwesome6 name="receipt" size={24} color={theme.error} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 12, color: theme.textMuted }}>总支出</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.error }}>{formatCurrency(totalExpense)}</Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome6 name="wallet" size={24} color={theme.success} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 12, color: theme.textMuted }}>总收入</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.success }}>{formatCurrency(totalIncome)}</Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome6 name="clock" size={24} color={theme.error} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 12, color: theme.textMuted }}>未收款</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.error }}>{formatCurrency(totalUnpaid)}</Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome6 name="scale-balanced" size={24} color={theme.primary} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 12, color: theme.textMuted }}>净收益</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: totalNetProfit >= 0 ? theme.success : theme.error }}>{formatCurrency(totalNetProfit)}</Text>
              </View>
            </View>
          </ThemedView>

          {/* ========== 新增：应收账款追踪 ========== */}
          {!selectedProjectId && receivablesData.length > 0 && (
            <ThemedView level="default" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionTypeBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={{ fontSize: 12, color: '#fff' }}>应收</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary }}>应收账款追踪</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>待收款总额</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.error }}>{formatCurrency(totalUnreceived)}</Text>
                </View>
              </View>

              {receivablesData.slice(0, 5).map((item, index) => (
                <View key={item.projectId} style={styles.receivableItem}>
                  <View style={styles.receivableHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.typeBadgeSmall, { backgroundColor: item.projectType === 'delivery' ? '#E53935' : theme.primary }]}>
                        <Text style={{ fontSize: 10, color: '#fff' }}>{item.projectType === 'delivery' ? '采' : '工'}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary, flex: 1, marginLeft: 8 }} numberOfLines={1}>
                        {item.projectName}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.error }}>
                      {formatCurrency(item.unreceivedAmount)}
                    </Text>
                  </View>
                  
                  {/* 进度条 */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { 
                            width: `${item.progress}%`,
                            backgroundColor: getProgressColor(item.progress)
                          }
                        ]} 
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: getProgressColor(item.progress), marginLeft: 8, width: 50, textAlign: 'right' }}>
                      {item.progress.toFixed(0)}%
                    </Text>
                  </View>
                  
                  <View style={styles.receivableFooter}>
                    <Text style={{ fontSize: 12, color: theme.textMuted }}>
                      已收: {formatCurrency(item.receivedAmount)}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted }}>
                      总额: {formatCurrency(item.totalAmount)}
                    </Text>
                  </View>
                </View>
              ))}

              {receivablesData.length > 5 && (
                <Text style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>
                  还有 {receivablesData.length - 5} 个项目待收款...
                </Text>
              )}
            </ThemedView>
          )}

          {/* ========== 新增：项目利润排行榜 ========== */}
          {!selectedProjectId && profitRanking.length > 0 && (
            <ThemedView level="default" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionTypeBadge, { backgroundColor: theme.success }]}>
                    <Text style={{ fontSize: 12, color: '#fff' }}>排行</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary }}>项目利润排行榜</Text>
                </View>
              </View>

              {profitRanking.map((item, index) => (
                <TouchableOpacity 
                  key={item.projectId} 
                  style={styles.rankingItem}
                  onPress={() => router.push('/projects/detail', { id: item.projectId })}
                >
                  <View style={styles.rankingHeader}>
                    {/* 排名徽章 */}
                    <View style={[
                      styles.rankingBadge,
                      { 
                        backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : theme.backgroundTertiary 
                      }
                    ]}>
                      <Text style={{ 
                        fontSize: 12, 
                        fontWeight: 'bold', 
                        color: index < 3 ? '#fff' : theme.textMuted 
                      }}>
                        {index + 1}
                      </Text>
                    </View>
                    
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.typeBadgeSmall, { backgroundColor: item.projectType === 'delivery' ? '#E53935' : theme.primary }]}>
                          <Text style={{ fontSize: 10, color: '#fff' }}>{item.projectType === 'delivery' ? '采' : '工'}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary, marginLeft: 6 }} numberOfLines={1}>
                          {item.projectName}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: item.netProfit >= 0 ? theme.success : theme.error }}>
                        {formatCurrency(item.netProfit)}
                      </Text>
                      <Text style={{ fontSize: 12, color: item.profitRate >= 0 ? theme.success : theme.error }}>
                        {item.profitRate >= 0 ? '+' : ''}{item.profitRate.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rankingStats}>
                    <View style={styles.rankingStatItem}>
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>总额</Text>
                      <Text style={{ fontSize: 12, color: theme.textPrimary }}>{formatCurrency(item.totalAmount)}</Text>
                    </View>
                    <View style={styles.rankingStatItem}>
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>支出</Text>
                      <Text style={{ fontSize: 12, color: theme.error }}>{formatCurrency(item.totalExpense)}</Text>
                    </View>
                    <View style={styles.rankingStatItem}>
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>利润率</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ 
                          width: 60, 
                          height: 4, 
                          backgroundColor: theme.backgroundTertiary, 
                          borderRadius: 2, 
                          overflow: 'hidden',
                          marginRight: 6
                        }}>
                          <View style={{ 
                            width: `${Math.min(Math.abs(item.profitRate), 100)}%`, 
                            height: '100%', 
                            backgroundColor: item.profitRate >= 0 ? theme.success : theme.error 
                          }} />
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ThemedView>
          )}

          {/* 工程项目统计 */}
          {!selectedProjectId && contractProjects.length > 0 && (
            <ThemedView level="default" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionTypeBadge, { backgroundColor: theme.primary }]}>
                    <Text style={{ fontSize: 12, color: '#fff' }}>合同</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary }}>工程项目</Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>{contractProjects.length} 个</Text>
              </View>
              <View style={styles.sectionStats}>
                <View style={styles.sectionStatItem}>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>合同总额</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.primary }}>
                    {formatCurrency(contractProjects.reduce((sum, p) => sum + (p.contractAmount || 0), 0))}
                  </Text>
                </View>
                <View style={styles.sectionStatItem}>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>未收款</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.error }}>{formatCurrency(contractTotalUnpaid)}</Text>
                </View>
              </View>
            </ThemedView>
          )}

          {/* 零星采购统计 */}
          {!selectedProjectId && deliveryStatsProjects.length > 0 && (
            <ThemedView level="default" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionTypeBadge, { backgroundColor: '#E53935' }]}>
                    <Text style={{ fontSize: 12, color: '#fff' }}>采购</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary }}>零星采购</Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>{deliveryStatsProjects.length} 个</Text>
              </View>
              <View style={styles.sectionStats}>
                <View style={styles.sectionStatItem}>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>送货总额</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.accent }}>{formatCurrency(deliveryTotalAmountVal)}</Text>
                </View>
                <View style={styles.sectionStatItem}>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>未收款</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.error }}>{formatCurrency(deliveryTotalUnpaid)}</Text>
                </View>
              </View>
            </ThemedView>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 项目选择器 Modal */}
        <Modal
          visible={showProjectSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProjectSelector(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowProjectSelector(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: theme.textPrimary }}>选择项目</Text>
                <TouchableOpacity onPress={() => setShowProjectSelector(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={projects}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.projectOption,
                      selectedProjectId === item.id && styles.projectOptionSelected,
                      selectedProjectId === item.id && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setSelectedProjectId(selectedProjectId === item.id ? null : item.id);
                      setShowProjectSelector(false);
                    }}
                  >
                    <View style={styles.projectOptionContent}>
                      <View style={[styles.typeBadgeSmall, { backgroundColor: item.projectType === 'delivery' ? '#E53935' : theme.primary }]}>
                        <Text style={{ fontSize: 10, color: '#fff' }}>
                          {item.projectType === 'delivery' ? '采' : '工'}
                        </Text>
                      </View>
                      <Text style={{ color: selectedProjectId === item.id ? '#fff' : theme.textPrimary }}>
                        {item.name}
                      </Text>
                    </View>
                    {selectedProjectId === item.id && (
                      <FontAwesome6 name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
                ListHeaderComponent={() => (
                  <TouchableOpacity
                    style={[
                      styles.projectOption,
                      selectedProjectId === null && styles.projectOptionSelected,
                      selectedProjectId === null && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setSelectedProjectId(null);
                      setShowProjectSelector(false);
                    }}
                  >
                    <Text style={{ color: selectedProjectId === null ? '#fff' : theme.textPrimary }}>
                      全部项目
                    </Text>
                    {selectedProjectId === null && (
                      <FontAwesome6 name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 零星采购项目选择器 Modal */}
        <Modal
          visible={deliveryRecordSelectorVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDeliveryRecordSelectorVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDeliveryRecordSelectorVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: theme.textPrimary }}>选择零星采购</Text>
                <TouchableOpacity onPress={() => setDeliveryRecordSelectorVisible(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={deliveryProjects}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.projectOption,
                      deliveryRecordProjectId === item.id && styles.projectOptionSelected,
                      deliveryRecordProjectId === item.id && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setDeliveryRecordProjectId(deliveryRecordProjectId === item.id ? null : item.id);
                      setDeliveryRecordSelectorVisible(false);
                    }}
                  >
                    <View style={styles.projectOptionContent}>
                      <View style={[styles.typeBadgeSmall, { backgroundColor: '#E53935' }]}>
                        <Text style={{ fontSize: 10, color: '#fff' }}>采</Text>
                      </View>
                      <Text style={{ color: deliveryRecordProjectId === item.id ? '#fff' : theme.textPrimary }}>
                        {item.name}
                      </Text>
                    </View>
                    {deliveryRecordProjectId === item.id && (
                      <FontAwesome6 name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
                ListHeaderComponent={() => (
                  <TouchableOpacity
                    style={[
                      styles.projectOption,
                      deliveryRecordProjectId === null && styles.projectOptionSelected,
                      deliveryRecordProjectId === null && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setDeliveryRecordProjectId(null);
                      setDeliveryRecordSelectorVisible(false);
                    }}
                  >
                    <Text style={{ color: deliveryRecordProjectId === null ? '#fff' : theme.textPrimary }}>
                      全部零星采购
                    </Text>
                    {deliveryRecordProjectId === null && (
                      <FontAwesome6 name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </ThemedView>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing['5xl'],
      flexGrow: 1,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    totalAmountCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      backgroundColor: theme.primary + '15',
    },
    totalAmountContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    totalAmountIconContainer: {
      width: 56,
      height: 56,
      borderRadius: BorderRadius.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.lg,
    },
    totalAmountInfo: {
      flex: 1,
    },
    overviewCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    statItem: {
      width: '48%',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    sectionCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    sectionTypeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
    },
    sectionStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    sectionStatItem: {
      alignItems: 'center',
    },
    // 应收账款样式
    receivableItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    receivableHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 6,
    },
    progressBarBackground: {
      flex: 1,
      height: 8,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    receivableFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    // 排行榜样式
    rankingItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rankingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rankingBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rankingStats: {
      flexDirection: 'row',
      marginTop: 8,
      marginLeft: 40,
      gap: Spacing.lg,
    },
    rankingStatItem: {
      flex: 1,
    },
    typeBadgeSmall: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    // Modal 样式
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.backgroundDefault,
      borderTopLeftRadius: BorderRadius.lg,
      borderTopRightRadius: BorderRadius.lg,
      maxHeight: '70%',
      paddingBottom: Spacing['2xl'],
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    projectOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    projectOptionSelected: {
      backgroundColor: theme.primary,
    },
    projectOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    projectSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.md,
    },
    summaryCard: {
      paddingVertical: Spacing.md,
    },
    summaryCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    summaryCardStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    summaryCardStatItem: {
      flex: 1,
      minWidth: '45%',
    },
  });
}
