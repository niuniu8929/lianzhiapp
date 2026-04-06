import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Modal, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Transaction, TransactionType, ExpenseCategory } from '@/types';
import { TransactionTypeNames } from '@/types';
import { TransactionStorage, ProjectStorage, ExpenseCategoryStorage } from '@/utils/storage';
import { generateUUID, formatDate } from '@/utils/helpers';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

export default function AddTransactionScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const { projectId } = useSafeSearchParams<{ projectId: string }>();

  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [type, setType] = useState<TransactionType>('material');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(formatDate(new Date().toISOString()));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;

    const projectData = await ProjectStorage.getById(projectId);
    if (!projectData) {
      alert('项目不存在');
      router.back();
      return;
    }

    setProject(projectData);
  }, [projectId, router]);

  const loadCategories = useCallback(async () => {
    const categoriesData = await ExpenseCategoryStorage.getAll();
    setCategories(categoriesData);
  }, []);

  React.useEffect(() => {
    loadProject();
    loadCategories();
  }, [loadProject, loadCategories]);

  const handleSave = async () => {
    if (!project) return;

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      alert('请输入有效的金额');
      return;
    }

    if (!description.trim()) {
      alert('请输入描述');
      return;
    }

    const newTransaction: Transaction = {
      id: generateUUID(),
      projectId: project.id,
      type,
      amount: amountValue,
      description: description.trim(),
      date,
      categoryId: selectedCategoryId || undefined,
      createdAt: new Date().toISOString(),
    };

    const success = await TransactionStorage.save(newTransaction);
    if (success) {
      router.back();
    } else {
      alert('保存失败，请重试');
    }
  };

  const TypeOption = ({ value, label }: { value: TransactionType; label: string }) => (
    <TouchableOpacity
      style={[type === value && styles.typeOptionSelected, { borderColor: type === value ? theme.primary : theme.border }]}
      onPress={() => setType(value)}
    >
      <View style={[styles.typeDot, { backgroundColor: getTypeColor(value) }]} />
      <ThemedText
        variant="body"
        color={type === value ? theme.textPrimary : theme.textSecondary}
        style={styles.typeLabel}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'material': return theme.primary;
      case 'equipment': return theme.success;
      case 'labor': return theme.accent;
      default: return theme.textSecondary;
    }
  };

  if (!project) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ThemedView level="root" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
        </ThemedView>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.backgroundTertiary }]} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.headerTitle}>
            添加交易
          </ThemedText>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSave}>
            <ThemedText variant="body" color={theme.buttonPrimaryText}>保存</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView level="default" style={styles.formCard}>
            <View style={styles.projectInfo}>
              <ThemedText variant="caption" color={theme.textMuted}>关联项目</ThemedText>
              <ThemedText variant="h4" color={theme.textPrimary}>{project.name}</ThemedText>
            </View>

            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              费用类型
            </ThemedText>
            <View style={styles.typeContainer}>
              {(Object.keys(TransactionTypeNames) as TransactionType[]).map((key) => (
                <TypeOption key={key} value={key} label={TransactionTypeNames[key]} />
              ))}
            </View>

            {categories.length > 0 && (
              <View style={styles.formField}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                  支出分类
                </ThemedText>
                <View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryContainer}
                  >
                    <TouchableOpacity
                      style={[styles.categoryChip, selectedCategoryId === null && styles.categoryChipSelected, { borderColor: selectedCategoryId === null ? theme.primary : theme.border }]}
                      onPress={() => setSelectedCategoryId(null)}
                    >
                      <ThemedText
                        variant="body"
                        color={selectedCategoryId === null ? theme.textPrimary : theme.textSecondary}
                        style={styles.categoryChipText}
                      >
                        不分类
                      </ThemedText>
                    </TouchableOpacity>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[styles.categoryChip, selectedCategoryId === category.id && styles.categoryChipSelected, { borderColor: selectedCategoryId === category.id ? category.color : theme.border, backgroundColor: selectedCategoryId === category.id ? category.color + '20' : 'transparent' }]}
                        onPress={() => setSelectedCategoryId(category.id)}
                      >
                        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                        <ThemedText
                          variant="body"
                          color={selectedCategoryId === category.id ? theme.textPrimary : theme.textSecondary}
                          style={styles.categoryChipText}
                        >
                          {category.name}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                金额（元）<ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入金额"
                placeholderTextColor={theme.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                描述<ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入交易描述"
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                日期<ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => setShowDatePicker(true)}
              >
                <FontAwesome6 name="calendar" size={18} color={theme.textSecondary} />
                <ThemedText variant="body" color={theme.textPrimary} style={styles.dateText}>
                  {date}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </ScrollView>
      </ThemedView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalContainer}>
              <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.modalHeader}>
                  <ThemedText variant="h4" color={theme.textPrimary}>选择日期</ThemedText>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <FontAwesome6 name="xmark" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {Array.from({ length: 30 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = formatDate(d.toISOString());
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateOption, date === dateStr && { backgroundColor: theme.primary }]}
                        onPress={() => {
                          setDate(dateStr);
                          setShowDatePicker(false);
                        }}
                      >
                        <ThemedText
                          variant="body"
                          color={date === dateStr ? theme.buttonPrimaryText : theme.textPrimary}
                        >
                          {dateStr}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
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
  backButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    flexGrow: 1,
  },
  formCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    boxShadow: '0px 2px 8px rgba(79, 70, 229, 0.08)',
  },
  projectInfo: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formTitle: {
    marginBottom: Spacing.md,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  typeOptionSelected: {
    borderWidth: 2,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 14,
  },
  categoryContainer: {
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginRight: Spacing.sm,
  },
  categoryChipSelected: {
    borderWidth: 2,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  categoryChipText: {
    fontSize: 14,
  },
  formField: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    paddingTop: Spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: 16,
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
  modalBody: {
    padding: Spacing.md,
  },
  dateOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
});
