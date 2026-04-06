import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Share, Platform, Text, Button, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { ProjectStorage, TransactionStorage, ExpenseCategoryStorage, ExportUtils, PaymentRecordStorage, InvoiceRecordStorage, DeliveryRecordStorage } from '@/utils/storage';
import { formatDateTime } from '@/utils/helpers';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { CustomAlert } from '@/components/CustomAlert';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { Project, PaymentRecord, InvoiceRecord, DeliveryRecord } from '@/types';

// 清除已完成项目的验证密码
const CLEAR_PASSWORD = '123456';

const PROJECTS_KEY = '@project_accounting_projects';
const TRANSACTIONS_KEY = '@project_accounting_transactions';

const DataAction = ({
  icon,
  title,
  description,
  color,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.dataCard} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
      <FontAwesome6 name={icon as any} size={28} color={color} />
    </View>
    <View style={styles.dataInfo}>
      <ThemedText variant="h4" color={stylesDataTheme.textPrimary} style={styles.dataTitle}>
        {title}
      </ThemedText>
      <ThemedText variant="body" color={stylesDataTheme.textMuted}>
        {description}
      </ThemedText>
    </View>
    <FontAwesome6 name="chevron-right" size={16} color={stylesDataTheme.textMuted} />
  </TouchableOpacity>
);

let stylesDataTheme: Theme;

function createStyles(theme: Theme) {
  stylesDataTheme = theme;
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
    section: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      boxShadow: '0px 2px 8px rgba(79, 70, 229, 0.08)',
    },
    sectionTitle: {
      marginBottom: Spacing.md,
    },
    // 统计卡片
    statCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    statIconContainer: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    statInfo: {
      flex: 1,
    },
    dataCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    dataInfo: {
      flex: 1,
    },
    dataTitle: {
      marginBottom: 2,
    },
    recordItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    recordInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    dangerSection: {
      borderWidth: 1,
      borderColor: theme.error + '30',
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.error + '10',
      marginBottom: Spacing.sm,
      minHeight: 48,
    },
    dangerButtonText: {
      marginLeft: Spacing.sm,
      fontWeight: '600',
    },
    dangerHint: {
      textAlign: 'center',
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
    recordSubTitle: {
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    recordDetail: {
      paddingVertical: Spacing.md,
      borderBottomColor: theme.borderLight,
    },
    recordDetailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
  });
}

const styles = createStyles({} as any);

export default function DataScreen() {
  const { theme, isDark } = useTheme();
  const localStyles = useMemo(() => createStyles(theme), [theme]);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons: {
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[];
  }>({ title: '', message: '', buttons: [] });

  // 修改密码弹窗
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // 清除数据密码验证弹窗
  const [clearPasswordModalVisible, setClearPasswordModalVisible] = useState(false);
  const [clearPasswordInput, setClearPasswordInput] = useState('');
  const [clearPasswordError, setClearPasswordError] = useState('');

  // 项目记录相关状态
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [projects, setProjects] = useState<Project[]>([]); // 合同项目（用于选择器）
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectPaymentRecords, setProjectPaymentRecords] = useState<PaymentRecord[]>([]);
  const [projectInvoiceRecords, setProjectInvoiceRecords] = useState<InvoiceRecord[]>([]);
  const [projectSelectorVisible, setProjectSelectorVisible] = useState(false);
  const [deliveryRecordsMap, setDeliveryRecordsMap] = useState<Record<string, DeliveryRecord[]>>({});

  // 零星采购开票收款记录相关状态
  const [deliveryProjects, setDeliveryProjects] = useState<Project[]>([]);
  const [selectedDeliveryProjectId, setSelectedDeliveryProjectId] = useState<string | null>(null);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [deliveryProjectSelectorVisible, setDeliveryProjectSelectorVisible] = useState(false);

  const showCustomAlert = (
    title: string,
    message: string,
    buttons: {
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[]
  ) => {
    setAlertConfig({ title, message, buttons });
    setAlertVisible(true);
  };

  // 加载项目列表和送货记录
  const loadProjects = async () => {
    const allProjData = await ProjectStorage.getAll();
    setAllProjects(allProjData);
    // 只保留合同项目（projectType === 'contract' 或没有 projectType 的旧项目）
    const contractProjects = allProjData.filter(p => p.projectType === 'contract' || !p.projectType);
    setProjects(contractProjects);

    // 加载送货记录
    const allDeliveryRecords = await DeliveryRecordStorage.getAll();
    const recordsMap: Record<string, DeliveryRecord[]> = {};
    allDeliveryRecords.forEach(record => {
      if (!recordsMap[record.projectId]) {
        recordsMap[record.projectId] = [];
      }
      recordsMap[record.projectId].push(record);
    });
    setDeliveryRecordsMap(recordsMap);

    // 零星采购项目
    const deliveryProjData = allProjData.filter(p => p.projectType === 'delivery');
    setDeliveryProjects(deliveryProjData);
  };

  // 加载选中项目的记录
  const loadProjectRecords = useCallback(async (projectId: string | null) => {
    if (!projectId) {
      setProjectPaymentRecords([]);
      setProjectInvoiceRecords([]);
      return;
    }

    const paymentRecords = await PaymentRecordStorage.getByProjectId(projectId);
    const invoiceRecords = await InvoiceRecordStorage.getByProjectId(projectId);

    // 按创建时间倒序排列
    paymentRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    invoiceRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setProjectPaymentRecords(paymentRecords);
    setProjectInvoiceRecords(invoiceRecords);
  }, []);

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setProjectSelectorVisible(false);
  };

  const handleDeliveryProjectSelect = (projectId: string) => {
    setSelectedDeliveryProjectId(projectId);
    setDeliveryProjectSelectorVisible(false);
    loadDeliveryProjectRecords(projectId);
  };

  // 加载选中零星采购项目的记录
  const loadDeliveryProjectRecords = useCallback(async (projectId: string | null) => {
    if (!projectId) {
      setDeliveryRecords([]);
      return;
    }

    const records = await DeliveryRecordStorage.getByProjectId(projectId);
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDeliveryRecords(records);
  }, []);

  // 当选中的零星采购项目改变时，加载对应的记录
  React.useEffect(() => {
    loadDeliveryProjectRecords(selectedDeliveryProjectId);
  }, [selectedDeliveryProjectId, loadDeliveryProjectRecords]);

  // 补录缺失记录
  const handleFixMissingRecords = useCallback(() => {
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) {
      showCustomAlert('错误', '项目未找到', [{ text: '确定', style: 'default' }]);
      return;
    }

    const totalPayment = projectPaymentRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalInvoice = projectInvoiceRecords.reduce((sum, r) => sum + r.amount, 0);
    const paymentDiff = project.receivedAmount - totalPayment;
    const invoiceDiff = project.invoiceAmount - totalInvoice;

    if (paymentDiff <= 0 && invoiceDiff <= 0) {
      showCustomAlert('提示', '没有需要补录的记录', [{ text: '确定', style: 'default' }]);
      return;
    }

    let message = '将补录以下缺失记录：\n\n';
    if (paymentDiff > 0) {
      message += `收款记录：¥${paymentDiff.toLocaleString()}\n`;
    }
    if (invoiceDiff > 0) {
      message += `开票记录：¥${invoiceDiff.toLocaleString()}\n`;
    }
    message += '\n是否继续？';

    showCustomAlert('补录缺失记录', message, [
      { text: '取消', style: 'cancel' },
      {
        text: '补录',
        style: 'default',
        onPress: async () => {
          // 补录收款记录
          if (paymentDiff > 0) {
            await PaymentRecordStorage.save({
              id: `payment-${Date.now()}`,
              projectId: project.id,
              projectName: project.name,
              amount: paymentDiff,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          }
          // 补录开票记录
          if (invoiceDiff > 0) {
            await InvoiceRecordStorage.save({
              id: `invoice-${Date.now()}`,
              projectId: project.id,
              projectName: project.name,
              amount: invoiceDiff,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          }
          loadProjectRecords(selectedProjectId);
          loadProjects();
          showCustomAlert('成功', '缺失记录已补录', [{ text: '确定', style: 'default' }]);
        },
      },
    ]);
  }, [projects, selectedProjectId, projectPaymentRecords, projectInvoiceRecords, loadProjectRecords, showCustomAlert]);

  // 同步项目金额
  const handleSyncProjectAmount = useCallback(() => {
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) {
      showCustomAlert('错误', '项目未找到', [{ text: '确定', style: 'default' }]);
      return;
    }

    const totalPayment = projectPaymentRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalInvoice = projectInvoiceRecords.reduce((sum, r) => sum + r.amount, 0);

    showCustomAlert(
      '同步项目金额',
      `将项目金额更新为记录合计：\n\n收款：¥${project.receivedAmount.toLocaleString()} → ¥${totalPayment.toLocaleString()}\n开票：¥${project.invoiceAmount.toLocaleString()} → ¥${totalInvoice.toLocaleString()}\n\n是否继续？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '同步',
          style: 'default',
          onPress: async () => {
            const updatedProject = {
              ...project,
              receivedAmount: totalPayment,
              invoiceAmount: totalInvoice,
              invoiceStatus: totalInvoice === 0 ? 'none' as const : (totalInvoice >= (project.contractAmount || 0) ? 'completed' as const : 'partial' as const),
              updatedAt: new Date().toISOString(),
            };
            await ProjectStorage.save(updatedProject);
            loadProjects();
            loadProjectRecords(selectedProjectId);
            showCustomAlert('成功', '项目金额已同步', [{ text: '确定', style: 'default' }]);
          },
        },
      ]
    );
  }, [projects, selectedProjectId, projectPaymentRecords, projectInvoiceRecords, loadProjectRecords, loadProjects, showCustomAlert]);

  // 刷新所有数据
  const refreshAllData = useCallback(async () => {
    await loadProjects();
    if (selectedProjectId) {
      await loadProjectRecords(selectedProjectId);
    }
  }, [selectedProjectId, loadProjectRecords]);

  // 当选中的项目改变时，加载对应的记录
  React.useEffect(() => {
    loadProjectRecords(selectedProjectId);
  }, [selectedProjectId, loadProjectRecords]);

  // 每次页面获得焦点时重新加载项目列表
  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  const handleExport = async () => {
    try {
      const data = await ExportUtils.exportData();
      const fileName = `project-accounting-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = (FileSystem as any).documentDirectory + fileName;

      await (FileSystem as any).writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));

      if (Platform.OS === 'android') {
        const permissions = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const directoryUri = permissions.directoryUri;
          const fileUri2 = await (FileSystem as any).StorageAccessFramework.createFileAsync(
            directoryUri,
            fileName,
            'application/json'
          );
          await (FileSystem as any).writeAsStringAsync(fileUri2, JSON.stringify(data, null, 2));
          showCustomAlert('导出成功', `文件已保存至：${fileName}`, [{ text: '确定', style: 'default' }]);
        }
      } else {
        await Share.share({
          url: fileUri,
          message: '项目记账数据导出',
        });
      }
    } catch (error) {
      console.error('导出失败:', error);
      showCustomAlert('导出失败', '请重试或检查权限设置', [{ text: '确定', style: 'default' }]);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await (FileSystem as any).readAsStringAsync(fileUri);
      const data = JSON.parse(fileContent);

      showCustomAlert(
        '确认导入',
        '导入将覆盖现有数据，是否继续？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '导入',
            style: 'destructive',
            onPress: async () => {
              const success = await ExportUtils.importData(data);
              if (success) {
                showCustomAlert('导入成功', '数据已成功导入', [{ text: '确定', style: 'default' }]);
              } else {
                showCustomAlert('导入失败', '数据格式不正确或导入出错', [{ text: '确定', style: 'default' }]);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('导入失败:', error);
      showCustomAlert('导入失败', '请选择有效的 JSON 文件', [{ text: '确定', style: 'default' }]);
    }
  };

  const handleClearCompletedProjects = async () => {
    // 先弹出密码验证弹窗
    setClearPasswordInput('');
    setClearPasswordError('');
    setClearPasswordModalVisible(true);
  };

  // 验证密码并执行清除操作
  const handleConfirmClearWithPassword = useCallback(async () => {
    if (clearPasswordInput !== CLEAR_PASSWORD) {
      setClearPasswordError('密码错误，请重新输入');
      return;
    }

    // 密码正确，关闭弹窗并执行清除
    setClearPasswordModalVisible(false);
    setClearPasswordInput('');
    setClearPasswordError('');

    try {
      // 获取所有项目
      const allProjects = await ProjectStorage.getAll();
      const completedProjects = allProjects.filter(p => p.status === 'completed');

      if (completedProjects.length === 0) {
        showCustomAlert('提示', '没有已完成的项目需要清除', [
          { text: '确定', style: 'default' }
        ]);
        return;
      }

      // 获取所有交易记录和送货记录
      const allTransactions = await TransactionStorage.getAll();
      const allDeliveryRecords = await DeliveryRecordStorage.getAll();
      const completedProjectIds = completedProjects.map(p => p.id);

      // 删除已完成项目的所有相关记录
      for (const projectId of completedProjectIds) {
        await PaymentRecordStorage.deleteByProjectId(projectId);
        await InvoiceRecordStorage.deleteByProjectId(projectId);
        await DeliveryRecordStorage.deleteByProjectId(projectId);
      }

      // 筛选出需要保留的交易记录（不属于已完成项目的）
      const transactionsToKeep = allTransactions.filter(
        t => !completedProjectIds.includes(t.projectId)
      );

      // 筛选出需要保留的送货记录（不属于已完成项目的）
      const deliveryRecordsToKeep = allDeliveryRecords.filter(
        r => !completedProjectIds.includes(r.projectId)
      );

      // 筛选出需要保留的项目（非已完成状态）
      const projectsToKeep = allProjects.filter(p => p.status !== 'completed');

      // 更新存储
      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projectsToKeep));
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactionsToKeep));

      // 统计删除的送货记录数量
      const deletedDeliveryCount = allDeliveryRecords.length - deliveryRecordsToKeep.length;

      showCustomAlert(
        '清除成功',
        `已清除 ${completedProjects.length} 个已完成项目\n- 支出记录: ${allTransactions.length - transactionsToKeep.length} 条\n- 送货记录: ${deletedDeliveryCount} 条`,
        [{ text: '确定', style: 'default' }]
      );

      // 刷新数据
      loadProjects();
    } catch (error) {
      console.error('清除已完成项目失败:', error);
      showCustomAlert('清除失败', '请重试', [
        { text: '确定', style: 'default' }
      ]);
    }
  }, [clearPasswordInput, showCustomAlert, loadProjects]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={localStyles.container}>
        <View style={localStyles.header}>
          <ThemedText variant="h2" color={theme.textPrimary}>数据管理</ThemedText>
          <TouchableOpacity 
            style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              backgroundColor: theme.backgroundTertiary, 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
            onPress={() => setPasswordModalVisible(true)}
          >
            <FontAwesome6 name="gear" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={localStyles.scrollContent}>
          <ThemedView level="default" style={localStyles.section}>
            <ThemedText variant="h4" color={theme.textSecondary} style={localStyles.sectionTitle}>
              数据操作
            </ThemedText>

            <DataAction
              icon="download"
              title="导出数据"
              description="将所有项目和交易记录导出为 JSON 文件"
              color={theme.primary}
              onPress={handleExport}
            />

            <DataAction
              icon="upload"
              title="导入数据"
              description="从 JSON 文件导入数据（将覆盖现有数据）"
              color={theme.success}
              onPress={handleImport}
            />
          </ThemedView>

          {/* 项目开票收款记录 */}
          <ThemedView level="default" style={localStyles.section}>
            <ThemedText variant="h4" color={theme.textSecondary} style={localStyles.sectionTitle}>
              项目开票收款记录
            </ThemedText>

            {/* 项目选择器 */}
            <TouchableOpacity
              style={[localStyles.projectSelector, { backgroundColor: theme.backgroundTertiary }]}
              onPress={() => setProjectSelectorVisible(true)}
            >
              <ThemedText variant="body" color={selectedProjectId ? theme.textPrimary : theme.textMuted}>
                {selectedProjectId
                  ? projects.find(p => p.id === selectedProjectId)?.name || '选择项目'
                  : '选择项目查看记录'
                }
              </ThemedText>
              <FontAwesome6 name="chevron-down" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            {/* 同步和补录按钮 */}
            {selectedProjectId && (
              <>
                {/* 显示当前差异 */}
                {(() => {
                  const project = projects.find(p => p.id === selectedProjectId);
                  if (!project) return null;
                  const totalPayment = projectPaymentRecords.reduce((sum, r) => sum + r.amount, 0);
                  const totalInvoice = projectInvoiceRecords.reduce((sum, r) => sum + r.amount, 0);
                  const paymentDiff = project.receivedAmount - totalPayment;
                  const invoiceDiff = project.invoiceAmount - totalInvoice;

                  return (
                    <View style={{ backgroundColor: theme.error + '10', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, marginTop: Spacing.md }}>
                      <ThemedText variant="body" color={theme.error} style={{ fontWeight: '600', marginBottom: Spacing.xs }}>
                        数据差异检测
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textPrimary}>
                        项目收款：¥{project.receivedAmount.toLocaleString()}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textPrimary}>
                        记录收款：¥{totalPayment.toLocaleString()}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textPrimary}>
                        项目开票：¥{project.invoiceAmount.toLocaleString()}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textPrimary}>
                        记录开票：¥{totalInvoice.toLocaleString()}
                      </ThemedText>
                    </View>
                  );
                })()}

                {/* 按钮容器 */}
                <View style={{ marginBottom: Spacing.md }}>
                  {/* 补录缺失记录按钮 */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.lg,
                      borderRadius: BorderRadius.md,
                      backgroundColor: theme.success + '20',
                      marginBottom: Spacing.sm,
                    }}
                    onPress={() => handleFixMissingRecords()}
                  >
                    <FontAwesome6 name="circle-plus" size={16} color={theme.success} style={{ marginRight: Spacing.sm }} />
                    <ThemedText variant="body" color={theme.success}>补录缺失记录</ThemedText>
                  </TouchableOpacity>

                  {/* 同步项目金额按钮 */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.lg,
                      borderRadius: BorderRadius.md,
                      backgroundColor: theme.primary + '20',
                    }}
                    onPress={() => handleSyncProjectAmount()}
                  >
                    <FontAwesome6 name="rotate" size={16} color={theme.primary} style={{ marginRight: Spacing.sm }} />
                    <ThemedText variant="body" color={theme.primary}>同步项目金额</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}

                {/* 收款记录列表 */}
            {selectedProjectId && (
              <>
                <ThemedText variant="caption" color={theme.textSecondary} style={localStyles.recordSubTitle}>
                  收款记录 ({projectPaymentRecords.length})
                </ThemedText>
                {projectPaymentRecords.length > 0 ? (
                  projectPaymentRecords.map((record, index) => (
                    <TouchableOpacity
                      key={record.id}
                      style={[localStyles.recordDetail, { borderBottomWidth: index === projectPaymentRecords.length - 1 ? 0 : 1 }]}
                      onLongPress={() => {
                        showCustomAlert(
                          '删除收款记录',
                          `确定要删除这条收款记录（¥${record.amount.toLocaleString()}）吗？`,
                          [
                            { text: '取消', style: 'cancel' },
                            {
                              text: '删除',
                              style: 'destructive',
                              onPress: async () => {
                                await PaymentRecordStorage.delete(record.id);
                                loadProjectRecords(selectedProjectId);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <View style={localStyles.recordDetailHeader}>
                        <FontAwesome6 name="wallet" size={16} color={theme.success} />
                        <ThemedText variant="body" color={theme.textPrimary} style={{ fontWeight: '600' }}>
                          ¥{record.amount.toLocaleString()}
                        </ThemedText>
                      </View>
                      <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 4 }}>
                        {formatDateTime(record.createdAt)}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 2, fontSize: 10 }}>
                        长按可删除
                      </ThemedText>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText variant="caption" color={theme.textMuted} style={{ paddingVertical: Spacing.md }}>
                    暂无收款记录
                  </ThemedText>
                )}

                {/* 开票记录列表 */}
                <ThemedText variant="caption" color={theme.textSecondary} style={[localStyles.recordSubTitle, { marginTop: Spacing.lg }]}>
                  开票记录 ({projectInvoiceRecords.length})
                </ThemedText>
                {projectInvoiceRecords.length > 0 ? (
                  projectInvoiceRecords.map((record, index) => (
                    <TouchableOpacity
                      key={record.id}
                      style={[localStyles.recordDetail, { borderBottomWidth: index === projectInvoiceRecords.length - 1 ? 0 : 1 }]}
                      onLongPress={() => {
                        showCustomAlert(
                          '删除开票记录',
                          `确定要删除这条开票记录（¥${record.amount.toLocaleString()}）吗？`,
                          [
                            { text: '取消', style: 'cancel' },
                            {
                              text: '删除',
                              style: 'destructive',
                              onPress: async () => {
                                await InvoiceRecordStorage.delete(record.id);
                                loadProjectRecords(selectedProjectId);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <View style={localStyles.recordDetailHeader}>
                        <FontAwesome6 name="file-invoice" size={16} color={theme.error} />
                        <ThemedText variant="body" color={theme.textPrimary} style={{ fontWeight: '600' }}>
                          ¥{record.amount.toLocaleString()}
                        </ThemedText>
                      </View>
                      <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 4 }}>
                        {formatDateTime(record.createdAt)}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 2, fontSize: 10 }}>
                        长按可删除
                      </ThemedText>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText variant="caption" color={theme.textMuted} style={{ paddingVertical: Spacing.md }}>
                    暂无开票记录
                  </ThemedText>
                )}
              </>
            )}
          </ThemedView>

          {/* 零星采购开票收款记录 */}
          <ThemedView level="default" style={localStyles.section}>
            <ThemedText variant="h4" color={theme.textSecondary} style={localStyles.sectionTitle}>
              零星采购开票收款记录
            </ThemedText>

            {/* 项目选择器 */}
            <TouchableOpacity
              style={[localStyles.projectSelector, { backgroundColor: theme.backgroundTertiary }]}
              onPress={() => setDeliveryProjectSelectorVisible(true)}
            >
              <ThemedText variant="body" color={selectedDeliveryProjectId ? theme.textPrimary : theme.textMuted}>
                {selectedDeliveryProjectId
                  ? deliveryProjects.find(p => p.id === selectedDeliveryProjectId)?.name || '选择项目'
                  : '选择零星采购项目'
                }
              </ThemedText>
              <FontAwesome6 name="chevron-down" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            {/* 送货记录统计 */}
            {selectedDeliveryProjectId && (
              <>
                {/* 汇总统计卡片 */}
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <ThemedView level="tertiary" style={{ flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' }}>
                    <ThemedText variant="caption" color={theme.textMuted} style={{ fontSize: 10 }}>总金额</ThemedText>
                    <ThemedText variant="body" color={theme.primary} style={{ fontWeight: '600' }}>
                      ¥{deliveryRecords.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView level="tertiary" style={{ flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' }}>
                    <ThemedText variant="caption" color={theme.textMuted} style={{ fontSize: 10 }}>已收款</ThemedText>
                    <ThemedText variant="body" color={theme.success} style={{ fontWeight: '600' }}>
                      ¥{deliveryRecords.reduce((sum, r) => sum + r.receivedAmount, 0).toLocaleString()}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView level="tertiary" style={{ flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' }}>
                    <ThemedText variant="caption" color={theme.textMuted} style={{ fontSize: 10 }}>已开票</ThemedText>
                    <ThemedText variant="body" color={theme.error} style={{ fontWeight: '600' }}>
                      ¥{deliveryRecords.reduce((sum, r) => sum + r.invoiceAmount, 0).toLocaleString()}
                    </ThemedText>
                  </ThemedView>
                </View>

                {/* 未收款和未开票金额 */}
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <ThemedView level="tertiary" style={{ flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' }}>
                    <ThemedText variant="caption" color={theme.textMuted} style={{ fontSize: 10 }}>未收款</ThemedText>
                    <ThemedText variant="body" color={theme.accent} style={{ fontWeight: '600' }}>
                      ¥{(deliveryRecords.reduce((sum, r) => sum + r.amount, 0) - deliveryRecords.reduce((sum, r) => sum + r.receivedAmount, 0)).toLocaleString()}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView level="tertiary" style={{ flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' }}>
                    <ThemedText variant="caption" color={theme.textMuted} style={{ fontSize: 10 }}>未开票</ThemedText>
                    <ThemedText variant="body" color={theme.error} style={{ fontWeight: '600' }}>
                      ¥{(deliveryRecords.reduce((sum, r) => sum + r.amount, 0) - deliveryRecords.reduce((sum, r) => sum + r.invoiceAmount, 0)).toLocaleString()}
                    </ThemedText>
                  </ThemedView>
                </View>

                {/* 送货记录列表 */}
                <ThemedText variant="caption" color={theme.textSecondary} style={localStyles.recordSubTitle}>
                  送货记录 ({deliveryRecords.length})
                </ThemedText>
                {deliveryRecords.length > 0 ? (
                  deliveryRecords.map((record, index) => (
                    <View
                      key={record.id}
                      style={[localStyles.recordDetail, { borderBottomWidth: index === deliveryRecords.length - 1 ? 0 : 1 }]}
                    >
                      <View style={localStyles.recordDetailHeader}>
                        <FontAwesome6 name="truck" size={16} color={theme.primary} />
                        <ThemedText variant="body" color={theme.textPrimary} style={{ fontWeight: '600' }}>
                          ¥{record.amount.toLocaleString()}
                        </ThemedText>
                      </View>
                      <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 4 }}>
                        {record.date} · {record.description || '无描述'}
                      </ThemedText>
                      <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: 4 }}>
                        <ThemedText variant="caption" color={theme.success}>
                          已收款: ¥{record.receivedAmount.toLocaleString()}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.error}>
                          已开票: ¥{record.invoiceAmount.toLocaleString()}
                        </ThemedText>
                      </View>
                    </View>
                  ))
                ) : (
                  <ThemedText variant="caption" color={theme.textMuted} style={{ paddingVertical: Spacing.md }}>
                    暂无送货记录
                  </ThemedText>
                )}
              </>
            )}
          </ThemedView>

          <View style={{ height: Spacing['5xl'] }} />

        {/* 数据清理区域 */}
        <View style={[localStyles.section, localStyles.dangerSection, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText variant="h4" color={theme.textSecondary} style={localStyles.sectionTitle}>
            数据清理
          </ThemedText>

          {/* 安全清空按钮 - 清除已完成项目 */}
          <View style={{ marginBottom: Spacing.md, backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#4CAF50' }}>
            <Text style={{ fontSize: 14, color: '#2E7D32', marginBottom: 8, fontWeight: 'bold' }}>✅ 安全清空功能</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                paddingVertical: 15,
                paddingHorizontal: 20,
                borderRadius: 8,
                alignItems: 'center',
                minHeight: 50,
                flexDirection: 'row',
                justifyContent: 'center',
              }}
              onPress={handleClearCompletedProjects}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="check" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>清除已完成项目</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#2E7D32', marginTop: 8, textAlign: 'center' }}>
              只清除已完成的项目和相关支出，保留进行中和已暂停的项目
            </Text>
          </View>
        </View>
        </ScrollView>
      </ThemedView>

      {/* 自定义 Alert Modal */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />

      {/* 项目选择器 Modal */}
      <Modal visible={projectSelectorVisible} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setProjectSelectorVisible(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.backgroundDefault, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
                <ThemedText variant="h4" color={theme.textPrimary}>选择项目</ThemedText>
                <TouchableOpacity onPress={() => setProjectSelectorVisible(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                {projects.length > 0 ? (
                  projects.map(project => (
                    <TouchableOpacity
                      key={project.id}
                      style={{
                        paddingVertical: Spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.borderLight,
                      }}
                      onPress={() => handleProjectSelect(project.id)}
                    >
                      <ThemedText variant="body" color={selectedProjectId === project.id ? theme.primary : theme.textPrimary}>
                        {project.name}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>
                        已收款: ¥{project.receivedAmount.toLocaleString()} · 已开票: ¥{project.invoiceAmount.toLocaleString()}
                      </ThemedText>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText variant="body" color={theme.textMuted} style={{ textAlign: 'center', paddingVertical: Spacing.xl }}>
                    暂无项目
                  </ThemedText>
                )}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 零星采购项目选择器 Modal */}
      <Modal visible={deliveryProjectSelectorVisible} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setDeliveryProjectSelectorVisible(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.backgroundDefault, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
                <ThemedText variant="h4" color={theme.textPrimary}>选择零星采购项目</ThemedText>
                <TouchableOpacity onPress={() => setDeliveryProjectSelectorVisible(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                {deliveryProjects.length > 0 ? (
                  deliveryProjects.map(project => (
                    <TouchableOpacity
                      key={project.id}
                      style={{
                        paddingVertical: Spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.borderLight,
                      }}
                      onPress={() => handleDeliveryProjectSelect(project.id)}
                    >
                      <ThemedText variant="body" color={selectedDeliveryProjectId === project.id ? theme.primary : theme.textPrimary}>
                        {project.name}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>
                        {project.description || '无描述'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText variant="body" color={theme.textMuted} style={{ textAlign: 'center', paddingVertical: Spacing.xl }}>
                    暂无零星采购项目
                  </ThemedText>
                )}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 修改密码弹窗 */}
      <ChangePasswordModal 
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />

      {/* 清除数据密码验证弹窗 */}
      <Modal
        visible={clearPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClearPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: Spacing.lg,
            }}
          >
            <View style={{
              backgroundColor: theme.backgroundDefault,
              borderRadius: BorderRadius.xl,
              padding: Spacing.xl,
              width: '100%',
              maxWidth: 400,
            }}>
              {/* 标题 */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: Spacing.lg,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.error + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: Spacing.md,
                  }}>
                    <FontAwesome6 name="shield-halved" size={20} color={theme.error} />
                  </View>
                  <ThemedText variant="h3" color={theme.textPrimary}>
                    安全验证
                  </ThemedText>
                </View>
                <TouchableOpacity onPress={() => setClearPasswordModalVisible(false)} style={{ padding: Spacing.sm }}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.lg }}>
                清除已完成项目是危险操作，请输入密码确认
              </ThemedText>

              {/* 密码输入 */}
              <View style={{ marginBottom: Spacing.lg }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.backgroundTertiary,
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.lg,
                  height: 52,
                  borderWidth: 1,
                  borderColor: clearPasswordError ? theme.error : 'transparent',
                }}>
                  <FontAwesome6 name="lock" size={18} color={theme.textMuted} style={{ marginRight: Spacing.md }} />
                  <TextInput
                    style={{ flex: 1, color: theme.textPrimary, fontSize: 16 }}
                    placeholder="请输入密码"
                    placeholderTextColor={theme.textMuted}
                    value={clearPasswordInput}
                    onChangeText={(text) => {
                      setClearPasswordInput(text);
                      setClearPasswordError('');
                    }}
                    secureTextEntry
                    maxLength={20}
                    returnKeyType="done"
                    onSubmitEditing={handleConfirmClearWithPassword}
                  />
                </View>
              </View>

              {/* 错误提示 */}
              {clearPasswordError ? (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: Spacing.md,
                  paddingHorizontal: Spacing.sm,
                }}>
                  <FontAwesome6 name="circle-exclamation" size={14} color={theme.error} />
                  <ThemedText variant="body" color={theme.error} style={{ marginLeft: Spacing.sm }}>
                    {clearPasswordError}
                  </ThemedText>
                </View>
              ) : null}

              {/* 按钮 */}
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: BorderRadius.md,
                    backgroundColor: theme.backgroundTertiary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setClearPasswordModalVisible(false);
                    setClearPasswordInput('');
                    setClearPasswordError('');
                  }}
                >
                  <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: BorderRadius.md,
                    backgroundColor: theme.error,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={handleConfirmClearWithPassword}
                >
                  <ThemedText variant="body" color="#FFFFFF">确认清除</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

import { StyleSheet } from 'react-native';
