import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Project, DeliveryRecord, InvoiceStatusNames } from '@/types';
import { ProjectStorage, TransactionStorage, DeliveryRecordStorage } from '@/utils/storage';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

// ============================================
// 辅助函数（移到组件外部，避免重复创建）
// ============================================
function getStatusColor(status: string, theme: Theme) {
  switch (status) {
    case 'active': return theme.success;
    case 'completed': return theme.primary;
    case 'paused': return theme.textMuted;
    default: return theme.textMuted;
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'active': return '进行中';
    case 'completed': return '已完成';
    case 'paused': return '已暂停';
    default: return status;
  }
}

function isOverdue(date: string) {
  return new Date(date) < new Date();
}

function calculateProjectDuration(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} 天`;
}

function calculateRunDuration(startDate: string) {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} 天`;
}

function calculateCountdown(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// ============================================
// Memoized 送货记录卡片组件
// ============================================
interface DeliveryCardProps {
  record: DeliveryRecord;
  index: number;
  totalCount: number;
  theme: Theme;
}

const DeliveryCard = memo(function DeliveryCard({ record, index, totalCount, theme }: DeliveryCardProps) {
  const cardStyle = useMemo(() => ({
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  }), []);

  return (
    <ThemedView level="default" style={cardStyle}>
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: theme.accent + '20' }]}>
              <ThemedText variant="caption" color={theme.accent}>第 {totalCount - index} 次</ThemedText>
            </View>
            <ThemedText variant="caption" color={theme.textMuted}>
              {formatDate(record.date)}
            </ThemedText>
          </View>
          <ThemedText variant="body" color={theme.textPrimary} numberOfLines={2}>
            {record.description}
          </ThemedText>
        </View>
        {record.amount > 0 && (
          <ThemedText variant="h4" color={theme.primary} style={styles.cardAmount}>
            {formatCurrency(record.amount)}
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重渲染
  return prevProps.record.id === nextProps.record.id &&
         prevProps.record.amount === nextProps.record.amount &&
         prevProps.index === nextProps.index &&
         prevProps.totalCount === nextProps.totalCount;
});

// ============================================
// 主组件
// ============================================
export default function ProjectDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);

  // 数据加载函数
  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      const [projectData, transactionsData, deliveryRecordsData] = await Promise.all([
        ProjectStorage.getById(id),
        TransactionStorage.getByProjectId(id),
        DeliveryRecordStorage.getByProjectId(id),
      ]);

      if (!projectData) {
        router.back();
        return;
      }

      const expense = transactionsData.reduce((sum, t) => sum + t.amount, 0);
      
      setProject(projectData);
      setDeliveryRecords([...deliveryRecordsData].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setTotalExpense(expense);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ============================================
  // 计算属性（全部缓存）
  // ============================================
  const isDelivery = useMemo(() => project?.projectType === 'delivery', [project?.projectType]);
  
  const deliveryTotalAmount = useMemo(() => 
    deliveryRecords.reduce((sum, r) => sum + (r.amount || 0), 0),
  [deliveryRecords]);

  const deliveryReceivedAmount = useMemo(() => 
    deliveryRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0),
  [deliveryRecords]);

  const deliveryInvoiceAmount = useMemo(() => 
    deliveryRecords.reduce((sum, r) => sum + (r.invoiceAmount || 0), 0),
  [deliveryRecords]);
  
  const contractAmount = useMemo(() => project?.contractAmount ?? 0, [project?.contractAmount]);
  const statusColor = useMemo(() => project ? getStatusColor(project.status, theme) : theme.textMuted, [project, theme]);
  const countdown = useMemo(() => project?.endDate ? calculateCountdown(project.endDate) : null, [project?.endDate]);

  const base = useMemo(() => isDelivery ? deliveryTotalAmount : contractAmount, [isDelivery, deliveryTotalAmount, contractAmount]);
  const received = useMemo(() => isDelivery ? deliveryReceivedAmount : (project?.receivedAmount ?? 0), [isDelivery, deliveryReceivedAmount, project?.receivedAmount]);
  const invoiced = useMemo(() => isDelivery ? deliveryInvoiceAmount : (project?.invoiceAmount ?? 0), [isDelivery, deliveryInvoiceAmount, project?.invoiceAmount]);
  const netProfit = useMemo(() => 
    isDelivery ? deliveryReceivedAmount - totalExpense : (project?.receivedAmount ?? 0) - totalExpense,
  [isDelivery, deliveryReceivedAmount, totalExpense, project?.receivedAmount]);
  
  const collectionRate = useMemo(() => base > 0 ? ((received / base) * 100).toFixed(1) : '0', [base, received]);
  const expenseRate = useMemo(() => base > 0 ? ((totalExpense / base) * 100).toFixed(1) : '0', [base, totalExpense]);
  const profitRate = useMemo(() => base > 0 ? ((netProfit / base) * 100).toFixed(1) : '0', [base, netProfit]);
  const invoiceRate = useMemo(() => base > 0 ? ((invoiced / base) * 100).toFixed(1) : '0', [base, invoiced]);
  const pendingInvoice = useMemo(() => Math.max(0, base - invoiced), [base, invoiced]);
  
  const invoiceStatus = useMemo((): 'none' | 'partial' | 'completed' => 
    isDelivery
      ? (deliveryInvoiceAmount === 0 ? 'none' : deliveryInvoiceAmount >= deliveryTotalAmount ? 'completed' : 'partial')
      : (project?.invoiceStatus ?? 'none'),
  [isDelivery, deliveryInvoiceAmount, deliveryTotalAmount, project?.invoiceStatus]);

  const deliveryStats = useMemo(() => ({
    totalAmount: deliveryTotalAmount,
    receivedAmount: deliveryReceivedAmount,
    invoiceAmount: deliveryInvoiceAmount,
    recordCount: deliveryRecords.length,
  }), [deliveryTotalAmount, deliveryReceivedAmount, deliveryInvoiceAmount, deliveryRecords.length]);

  // ============================================
  // FlatList 渲染函数
  // ============================================
  const renderDeliveryItem = useCallback(({ item, index }: { item: DeliveryRecord; index: number }) => (
    <DeliveryCard 
      record={item} 
      index={index} 
      totalCount={deliveryRecords.length}
      theme={theme}
    />
  ), [deliveryRecords.length, theme]);

  const keyExtractor = useCallback((item: DeliveryRecord) => item.id, []);

  // 注意：移除 getItemLayout，因为在 Android 上可能导致退出卡顿

  // ============================================
  // 列表头部内容
  // ============================================
  const ListHeader = useMemo(() => {
    if (!project) return null;

    return (
      <>
        {/* 项目基本信息 */}
        <ThemedView level="default" style={styles.card}>
          <View style={[styles.rowCenter, { marginBottom: project.description ? Spacing.md : 0 }]}>
            <View style={[styles.typeBadge, { backgroundColor: isDelivery ? theme.accent : theme.primary }]}>
              <ThemedText variant="caption" color="#FFFFFF" style={styles.typeBadgeText}>
                {isDelivery ? '采购' : '工程'}
              </ThemedText>
            </View>
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.projectName} numberOfLines={2}>
              {project.name}
            </ThemedText>
          </View>

          {project.description && (
            <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.md }}>
              {project.description}
            </ThemedText>
          )}

          <View style={styles.rowCenter}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <ThemedText variant="caption" color={statusColor}>
                {getStatusText(project.status)}
              </ThemedText>
            </View>
            {project.manager && (
              <View style={[styles.rowCenter, { marginLeft: Spacing.md }]}>
                <FontAwesome6 name="user" size={12} color={theme.textMuted} />
                <ThemedText variant="caption" color={theme.textSecondary} style={{ marginLeft: 4 }}>
                  {project.manager}
                </ThemedText>
              </View>
            )}
          </View>
        </ThemedView>

        {/* 时间规划 */}
        <ThemedView level="default" style={styles.card}>
          <ThemedText variant="h4" color={theme.textSecondary} style={{ marginBottom: Spacing.md }}>
            时间规划
          </ThemedText>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>开始日期</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>
              {project.startDate ? formatDate(project.startDate) : '未设置'}
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>
              {isDelivery ? '预计完成' : '竣工日期'}
            </ThemedText>
            <View style={styles.rowCenter}>
              <ThemedText variant="body" color={project.endDate && isOverdue(project.endDate) ? theme.error : theme.textPrimary}>
                {project.endDate ? formatDate(project.endDate) : '未设置'}
              </ThemedText>
              {project.endDate && countdown !== null && (
                <ThemedText 
                  variant="caption" 
                  color={countdown < 0 ? theme.error : (countdown <= 7 ? theme.accent : theme.success)} 
                  style={{ marginLeft: 8 }}
                >
                  {countdown < 0 
                    ? `(超期 ${Math.abs(countdown)} 天)` 
                    : countdown === 0 
                      ? '(今天)' 
                      : `(倒计时 ${countdown} 天)`}
                </ThemedText>
              )}
            </View>
          </View>
          {project.startDate && project.endDate && (
            <View style={styles.infoRow}>
              <ThemedText variant="caption" color={theme.textMuted}>项目周期</ThemedText>
              <ThemedText variant="body" color={theme.textPrimary}>
                {calculateProjectDuration(project.startDate, project.endDate)}
              </ThemedText>
            </View>
          )}
          {project.startDate && (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <ThemedText variant="caption" color={theme.textMuted}>已运行</ThemedText>
              <ThemedText variant="body" color={theme.textPrimary}>
                {calculateRunDuration(project.startDate)}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 财务概况 */}
        <ThemedView level="default" style={styles.card}>
          <ThemedText variant="h4" color={theme.textSecondary} style={{ marginBottom: Spacing.md }}>
            财务概况
          </ThemedText>
          
          {isDelivery && (
            <View style={[styles.deliveryBadge, { backgroundColor: theme.accent + '10' }]}>
              <FontAwesome6 name="truck" size={20} color={theme.accent} style={{ marginRight: Spacing.sm }} />
              <ThemedText variant="body" color={theme.accent}>
                共 {deliveryStats.recordCount} 次送货
              </ThemedText>
            </View>
          )}
          
          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <ThemedText variant="caption" color={theme.textMuted}>
                {isDelivery ? '送货总额' : '合同金额'}
              </ThemedText>
              <ThemedText variant="h2" color={theme.primary} style={{ marginTop: 4 }}>
                {formatCurrency(isDelivery ? deliveryTotalAmount : contractAmount)}
              </ThemedText>
            </View>
            {!isDelivery && (
              <View style={styles.amountItem}>
                <ThemedText variant="caption" color={theme.textMuted}>结算金额</ThemedText>
                <ThemedText variant="h2" color={theme.textSecondary} style={{ marginTop: 4 }}>
                  {formatCurrency(project.settlementAmount ?? 0)}
                </ThemedText>
              </View>
            )}
          </View>
          
          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <ThemedText variant="caption" color={theme.textMuted}>已收款</ThemedText>
              <ThemedText variant="h3" color={theme.success} style={{ marginTop: 4 }}>
                {formatCurrency(isDelivery ? deliveryReceivedAmount : project.receivedAmount)}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>
                收款率 {collectionRate}%
              </ThemedText>
            </View>
            <View style={styles.amountItem}>
              <ThemedText variant="caption" color={theme.textMuted}>已支出</ThemedText>
              <ThemedText variant="h3" color={theme.error} style={{ marginTop: 4 }}>
                {formatCurrency(totalExpense)}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>
                占比 {expenseRate}%
              </ThemedText>
            </View>
          </View>
          
          <View style={[styles.netProfitRow, { borderTopColor: theme.borderLight }]}>
            <ThemedText variant="caption" color={theme.textMuted}>净收益</ThemedText>
            <ThemedText variant="h2" color={netProfit >= 0 ? theme.success : theme.error} style={{ marginTop: 4 }}>
              {formatCurrency(netProfit)}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              利润率 {profitRate}%
            </ThemedText>
          </View>
        </ThemedView>

        {/* 开票信息 */}
        <ThemedView level="default" style={styles.card}>
          <ThemedText variant="h4" color={theme.textSecondary} style={{ marginBottom: Spacing.md }}>
            开票信息
          </ThemedText>
          <View style={[styles.amountRow, { marginBottom: pendingInvoice > 0 ? Spacing.md : 0 }]}>
            <View style={styles.amountItem}>
              <ThemedText variant="caption" color={theme.textMuted}>已开票金额</ThemedText>
              <ThemedText variant="h3" color={theme.primary} style={{ marginTop: 4 }}>
                {formatCurrency(isDelivery ? deliveryInvoiceAmount : project.invoiceAmount)}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>
                开票率 {invoiceRate}%
              </ThemedText>
            </View>
            <View style={styles.amountItem}>
              <ThemedText variant="caption" color={theme.textMuted}>开票状态</ThemedText>
              <ThemedText variant="h4" color={theme.primary} style={{ marginTop: 8 }}>
                {InvoiceStatusNames[invoiceStatus]}
              </ThemedText>
            </View>
          </View>
          {pendingInvoice > 0 && (
            <View style={[styles.netProfitRow, { borderTopColor: theme.borderLight }]}>
              <ThemedText variant="caption" color={theme.textMuted}>待开票金额</ThemedText>
              <ThemedText variant="h3" color={theme.textSecondary} style={{ marginTop: 4 }}>
                {formatCurrency(pendingInvoice)}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 送货记录标题 */}
        {isDelivery && deliveryRecords.length > 0 && (
          <View style={styles.sectionHeader}>
            <ThemedText variant="h4" color={theme.textSecondary}>送货记录</ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              共 {deliveryRecords.length} 条
            </ThemedText>
          </View>
        )}

        {/* 空状态 - 仅零星采购显示 */}
        {isDelivery && deliveryRecords.length === 0 && (
          <ThemedView level="default" style={[styles.card, styles.emptyState]}>
            <FontAwesome6 name="truck" size={48} color={theme.textMuted} style={{ marginBottom: Spacing.md }} />
            <ThemedText variant="body" color={theme.textSecondary}>
              暂无送货记录
            </ThemedText>
          </ThemedView>
        )}
      </>
    );
  }, [project, isDelivery, theme, statusColor, countdown, deliveryStats, contractAmount, deliveryTotalAmount, 
      deliveryReceivedAmount, totalExpense, collectionRate, expenseRate, netProfit, profitRate, 
      invoiceRate, invoiced, pendingInvoice, invoiceStatus, deliveryRecords.length]);

  // ============================================
  // 加载状态
  // ============================================
  if (!project) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ThemedView level="root" style={styles.container}>
          <View style={styles.loadingContainer}>
            <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
          </View>
        </ThemedView>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <FontAwesome6 name="arrow-left" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary}>
            项目详情
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* 使用 FlatList 替代 ScrollView */}
        {isDelivery && deliveryRecords.length > 0 ? (
          <FlatList
            data={deliveryRecords}
            renderItem={renderDeliveryItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
          />
        ) : (
          <FlatList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </Screen>
  );
}

// ============================================
// 样式常量（避免内联样式）
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    paddingBottom: Spacing['6xl'],
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  projectName: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  amountItem: {
    alignItems: 'center',
  },
  netProfitRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardAmount: {
    marginLeft: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
});
