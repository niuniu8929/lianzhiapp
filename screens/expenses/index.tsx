import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Transaction, Project, ExpenseCategory } from '@/types';
import { TransactionStorage, ProjectStorage, ExpenseCategoryStorage } from '@/utils/storage';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { TransactionTypeNames } from '@/types';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

const createStyles = (theme: Theme) => StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  filterButtonText: {
    flex: 1,
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  // 横向列表项样式
  transactionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    boxShadow: '0px 2px 8px rgba(79, 70, 229, 0.08)',
  },
  // 第一行：左侧金额+日期+状态 | 右侧描述
  firstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  // 第一行左侧：金额和日期
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  dateText: {
    marginLeft: Spacing.xs,
  },
  // 第二行：项目 | 分类 | 采购单位 | 图片
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  infoSeparator: {
    marginHorizontal: 2,
  },
  // 标签样式
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
});

export default function ExpensesScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showProjectFilter, setShowProjectFilter] = useState(false);
  const [filterUnpaid, setFilterUnpaid] = useState<boolean | null>(null);
  const [filterUninvoiced, setFilterUninvoiced] = useState<boolean | null>(null);

  const loadData = useCallback(async () => {
    const [txData, projData, catData] = await Promise.all([
      TransactionStorage.getAll(),
      ProjectStorage.getAll(),
      ExpenseCategoryStorage.getAll(),
    ]);
    setTransactions(txData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setProjects(projData);
    setCategories(catData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedCategory && tx.categoryId !== selectedCategory) return false;
      if (selectedProject && tx.projectId !== selectedProject) return false;
      if (filterUnpaid !== null && tx.isPaid === filterUnpaid) return false;
      if (filterUninvoiced !== null && tx.isInvoiced === filterUninvoiced) return false;
      return true;
    });
  }, [transactions, selectedCategory, selectedProject, filterUnpaid, filterUninvoiced]);

  const totalExpense = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredTransactions]);

  // 计算未开票金额
  const uninvoicedAmount = useMemo(() => {
    return filteredTransactions
      .filter((tx) => !tx.isInvoiced)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredTransactions]);

  // 计算未付款金额
  const unpaidAmount = useMemo(() => {
    return filteredTransactions
      .filter((tx) => !tx.isPaid)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredTransactions]);

  const handleTransactionPress = useCallback((transactionId: string) => {
    router.push('/expenses/edit', { id: transactionId });
  }, [router]);

  const renderTransactionItem = useCallback(({ item }: { item: Transaction }) => {
    const project = projects.find(p => p.id === item.projectId);
    const category = categories.find(c => c.id === item.categoryId);
    const hasImages = item.images && item.images.length > 0;

    return (
      <TouchableOpacity
        onPress={() => handleTransactionPress(item.id)}
        activeOpacity={0.7}
      >
        <ThemedView level="default" style={styles.transactionCard}>
          {/* 第一行：左侧金额+日期+状态+图片 | 右侧描述 */}
          <View style={styles.firstRow}>
            <View style={styles.amountRow}>
              <ThemedText variant="h4" color={theme.primary} style={{ fontWeight: '600' }}>
                {formatCurrency(item.amount)}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.dateText}>
                {formatDate(item.date)}
              </ThemedText>
              {/* 状态标签 */}
              {!item.isPaid && (
                <View style={[styles.miniTag, { backgroundColor: theme.error + '20' }]}>
                  <ThemedText variant="caption" color={theme.error} style={{ fontSize: 10 }}>
                    未付款
                  </ThemedText>
                </View>
              )}
              {item.isPaid && (
                <View style={[styles.miniTag, { backgroundColor: theme.primary + '20' }]}>
                  <ThemedText variant="caption" color={theme.primary} style={{ fontSize: 10 }}>
                    已付款
                  </ThemedText>
                </View>
              )}
              {!item.isInvoiced && (
                <View style={[styles.miniTag, { backgroundColor: theme.error + '20' }]}>
                  <ThemedText variant="caption" color={theme.error} style={{ fontSize: 10 }}>
                    未开票
                  </ThemedText>
                </View>
              )}
              {item.isInvoiced && (
                <View style={[styles.miniTag, { backgroundColor: theme.success + '20' }]}>
                  <ThemedText variant="caption" color={theme.success} style={{ fontSize: 10 }}>
                    已开票
                  </ThemedText>
                </View>
              )}
            </View>
            {/* 右侧描述 */}
            {item.description && (
              <ThemedText variant="body" color={theme.error} style={{ fontWeight: '600', maxWidth: '40%' }} numberOfLines={1}>
                {item.description}
              </ThemedText>
            )}
          </View>

          {/* 第二行：项目 | 分类 | 图片数量 | 采购单位（右上角） → */}
          <View style={styles.infoRow}>
            {project && (
              <>
                <FontAwesome6 name="folder" size={10} color={theme.success} />
                <ThemedText variant="caption" color={theme.success} style={{ fontWeight: '500' }} numberOfLines={1}>
                  {project.name}
                </ThemedText>
              </>
            )}
            {project && category && (
              <ThemedText variant="caption" color={theme.border} style={styles.infoSeparator}>
                |
              </ThemedText>
            )}
            {category && (
              <>
                <FontAwesome6 name="tag" size={10} color="#F59E0B" />
                <ThemedText variant="caption" color="#F59E0B" style={{ fontWeight: '500' }} numberOfLines={1}>
                  {category.name}
                </ThemedText>
              </>
            )}
            {category && hasImages && (
              <ThemedText variant="caption" color={theme.border} style={styles.infoSeparator}>
                |
              </ThemedText>
            )}
            {/* 图片数量标签 */}
            {hasImages && (
              <View style={[styles.miniTag, { backgroundColor: theme.accent + '20' }]}>
                <FontAwesome6 name="image" size={8} color={theme.accent} />
                <ThemedText variant="caption" color={theme.accent} style={{ fontSize: 10 }}>
                  {item.images!.length}张
                </ThemedText>
              </View>
            )}
            
            {/* 右侧：采购单位 + 箭头 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: Spacing.xs }}>
              {item.purchaseUnit && (
                <>
                  <FontAwesome6 name="building" size={10} color="#3B82F6" />
                  <ThemedText variant="caption" color="#3B82F6" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {item.purchaseUnit}
                  </ThemedText>
                </>
              )}
              <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
            </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  }, [projects, categories, theme, styles, handleTransactionPress]);

  const renderFilterButton = () => {
    if (selectedCategory || selectedProject || filterUnpaid !== null || filterUninvoiced !== null) {
      return (
        <TouchableOpacity
          style={{
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            borderRadius: BorderRadius.md,
            backgroundColor: theme.backgroundTertiary,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => {
            setSelectedCategory(null);
            setSelectedProject(null);
            setFilterUnpaid(null);
            setFilterUninvoiced(null);
          }}
        >
          <ThemedText variant="caption" color={theme.textSecondary}>
            清除筛选
          </ThemedText>
          <FontAwesome6 name="xmark" size={12} color={theme.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={{ flex: 1 }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.xl,
          paddingBottom: Spacing.lg,
        }}>
          <ThemedText variant="h3" color={theme.textPrimary}>
            支出记录
          </ThemedText>
          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              borderRadius: BorderRadius.sm,
              backgroundColor: theme.backgroundTertiary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => router.push('/expenses/categories')}
          >
            <FontAwesome6 name="tags" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 总支出、未付款金额、未开票金额并排显示 */}
        <View style={{
          paddingHorizontal: Spacing.lg,
          marginBottom: Spacing.lg,
          flexDirection: 'row',
          gap: Spacing.sm,
        }}>
          {/* 总支出卡片 */}
          <ThemedView level="default" style={{
            flex: 1,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
            boxShadow: '0px 2px 8px rgba(79, 70, 229, 0.08)',
          }}>
            <ThemedText variant="caption" color={theme.textSecondary} style={{ marginBottom: 4, fontSize: 11 }}>
              总支出
            </ThemedText>
            <ThemedText variant="h3" color={theme.primary}>
              {formatCurrency(totalExpense)}
            </ThemedText>
          </ThemedView>

          {/* 未付款金额卡片 */}
          <ThemedView level="default" style={{
            flex: 1,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
            boxShadow: '0px 2px 8px rgba(79, 70, 229, 0.08)',
          }}>
            <ThemedText variant="caption" color={theme.textSecondary} style={{ marginBottom: 4, fontSize: 11 }}>
              未付款金额
            </ThemedText>
            <ThemedText variant="h3" color={theme.accent}>
              {formatCurrency(unpaidAmount)}
            </ThemedText>
          </ThemedView>

          {/* 未开票金额卡片 */}
          <ThemedView level="default" style={{
            flex: 1,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
            boxShadow: '0px 2px 8px rgba(79, 70, 229, 0.08)',
          }}>
            <ThemedText variant="caption" color={theme.textSecondary} style={{ marginBottom: 4, fontSize: 11 }}>
              未开票金额
            </ThemedText>
            <ThemedText variant="h3" color={theme.error}>
              {formatCurrency(uninvoicedAmount)}
            </ThemedText>
          </ThemedView>
        </View>

        <View style={styles.filterRow}>
          <ThemedText variant="h4" color={theme.textSecondary}>
            筛选
          </ThemedText>
          {renderFilterButton()}
        </View>

        <View style={styles.filterContainer}>
          {categories.length > 0 && (
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: theme.backgroundTertiary }]}
              onPress={() => setShowCategoryFilter(true)}
            >
              <FontAwesome6 name="tag" size={14} color={selectedCategory ? theme.primary : theme.textSecondary} />
              <ThemedText
                variant="caption"
                color={selectedCategory ? theme.textPrimary : theme.textMuted}
                style={styles.filterButtonText}
              >
                {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || '全部分类' : '全部分类'}
              </ThemedText>
              <FontAwesome6 name="chevron-down" size={12} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          {projects.length > 0 && (
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: theme.backgroundTertiary }]}
              onPress={() => setShowProjectFilter(true)}
            >
              <FontAwesome6 name="folder" size={14} color={selectedProject ? theme.primary : theme.textSecondary} />
              <ThemedText
                variant="caption"
                color={selectedProject ? theme.textPrimary : theme.textMuted}
                style={styles.filterButtonText}
              >
                {selectedProject ? projects.find(p => p.id === selectedProject)?.name || '全部项目' : '全部项目'}
              </ThemedText>
              <FontAwesome6 name="chevron-down" size={12} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 状态筛选按钮 */}
        <View style={[styles.filterContainer, { marginBottom: Spacing.lg }]}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: filterUnpaid === true ? theme.accent + '20' : theme.backgroundTertiary,
                borderWidth: filterUnpaid === true ? 1 : 0,
                borderColor: filterUnpaid === true ? theme.accent : 'transparent',
              }
            ]}
            onPress={() => setFilterUnpaid(filterUnpaid === true ? null : true)}
          >
            <FontAwesome6 name="wallet" size={14} color={filterUnpaid === true ? theme.accent : theme.textSecondary} />
            <ThemedText
              variant="caption"
              color={filterUnpaid === true ? theme.accent : theme.textMuted}
              style={styles.filterButtonText}
            >
              未付款
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: filterUninvoiced === true ? theme.error + '20' : theme.backgroundTertiary,
                borderWidth: filterUninvoiced === true ? 1 : 0,
                borderColor: filterUninvoiced === true ? theme.error : 'transparent',
              }
            ]}
            onPress={() => setFilterUninvoiced(filterUninvoiced === true ? null : true)}
          >
            <FontAwesome6 name="file-invoice" size={14} color={filterUninvoiced === true ? theme.error : theme.textSecondary} />
            <ThemedText
              variant="caption"
              color={filterUninvoiced === true ? theme.error : theme.textMuted}
              style={styles.filterButtonText}
            >
              未开票
            </ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: Spacing['5xl'],
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: Spacing['6xl'],
            }}>
              <FontAwesome6 name="receipt" size={64} color={theme.textMuted} style={{ opacity: 0.5, marginBottom: Spacing.lg }} />
              <ThemedText variant="h4" color={theme.textSecondary} style={{ marginBottom: Spacing.sm }}>
                暂无支出记录
              </ThemedText>
              <ThemedText variant="body" color={theme.textMuted}>
                点击右下角按钮添加支出
              </ThemedText>
            </View>
          }
        />
        
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: Spacing.lg,
            bottom: Spacing.xl,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.primary,
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0px 4px 12px rgba(79, 70, 229, 0.3)',
          }}
          onPress={() => router.push('/expenses/add')}
        >
          <FontAwesome6 name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* 分类筛选 Modal */}
        <Modal
          visible={showCategoryFilter}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCategoryFilter(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setShowCategoryFilter(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h4" color={theme.textPrimary}>选择分类</ThemedText>
                <TouchableOpacity onPress={() => setShowCategoryFilter(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[{ id: null, name: '全部分类', color: theme.textSecondary }, ...categories]}
                keyExtractor={(item) => item.id || 'all'}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[styles.optionItem, index === categories.length && styles.optionItemLast, selectedCategory === item.id && { backgroundColor: item.id === null ? theme.primary + '20' : item.color + '20' }]}
                    onPress={() => {
                      setSelectedCategory(item.id);
                      setShowCategoryFilter(false);
                    }}
                  >
                    {item.id === null ? (
                      <FontAwesome6 name="tag" size={18} color={selectedCategory === null ? theme.primary : theme.textSecondary} />
                    ) : (
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
                    )}
                    <ThemedText variant="body" color={theme.textPrimary} style={{ marginLeft: Spacing.md, flex: 1 }}>
                      {item.name}
                    </ThemedText>
                    {selectedCategory === item.id && (
                      <FontAwesome6 name="check" size={18} color={item.id === null ? theme.primary : item.color} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 项目筛选 Modal */}
        <Modal
          visible={showProjectFilter}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProjectFilter(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setShowProjectFilter(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h4" color={theme.textPrimary}>选择项目</ThemedText>
                <TouchableOpacity onPress={() => setShowProjectFilter(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[{ id: null, name: '全部项目' }, ...projects]}
                keyExtractor={(item) => item.id || 'all'}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[styles.optionItem, index === projects.length && styles.optionItemLast, selectedProject === item.id && { backgroundColor: theme.primary + '20' }]}
                    onPress={() => {
                      setSelectedProject(item.id);
                      setShowProjectFilter(false);
                    }}
                  >
                    <FontAwesome6 name="folder" size={18} color={selectedProject === item.id ? theme.primary : theme.textSecondary} />
                    <ThemedText variant="body" color={theme.textPrimary} style={{ marginLeft: Spacing.md, flex: 1 }}>
                      {item.name}
                    </ThemedText>
                    {selectedProject === item.id && (
                      <FontAwesome6 name="check" size={18} color={theme.primary} />
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
