import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { ExpenseCategory } from '@/types';
import { ExpenseCategoryStorage } from '@/utils/storage';
import { generateUUID } from '@/utils/helpers';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

const CATEGORY_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
];

const ColorOption = ({ color, selected, onPress }: { color: string; selected: boolean; onPress: () => void }) => {
  return (
    <TouchableOpacity
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: selected ? '#000000' : 'transparent',
        marginRight: Spacing.sm,
      }}
      onPress={onPress}
    />
  );
};

const CategoryFormModal = ({ visible, category, onClose, onSave }: { visible: boolean; category: ExpenseCategory | null; onClose: () => void; onSave: (name: string, color: string) => void }) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    async function initForm() {
      if (category) {
        setName(category.name);
        setSelectedColor(category.color);
      } else {
        setName('');
        setSelectedColor(CATEGORY_COLORS[0]);
      }
    }
    initForm();
  }, [category, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入分类名称');
      return;
    }
    onSave(name.trim(), selectedColor);
    setName('');
    setSelectedColor(CATEGORY_COLORS[0]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{
              backgroundColor: theme.backgroundRoot,
              borderTopLeftRadius: BorderRadius.xl,
              borderTopRightRadius: BorderRadius.xl,
              paddingHorizontal: Spacing.xl,
              paddingTop: Spacing.xl,
              paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl }}>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  {category ? '编辑分类' : '新增分类'}
                </ThemedText>
                <TouchableOpacity onPress={onClose}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <View style={{ marginBottom: Spacing.xl }}>
                  <ThemedText variant="body" color={theme.textPrimary} style={{ marginBottom: Spacing.sm }}>
                    分类名称 <ThemedText style={{ color: theme.error }}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={{
                      backgroundColor: theme.backgroundTertiary,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: Spacing.md,
                      paddingVertical: Spacing.sm,
                      fontSize: 16,
                      color: theme.textPrimary,
                    }}
                    placeholder="请输入分类名称"
                    placeholderTextColor={theme.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                </View>

                <View style={{ marginBottom: Spacing.xl }}>
                  <ThemedText variant="body" color={theme.textPrimary} style={{ marginBottom: Spacing.sm }}>
                    选择颜色
                  </ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {CATEGORY_COLORS.map((color) => (
                      <ColorOption
                        key={color}
                        color={color}
                        selected={selectedColor === color}
                        onPress={() => setSelectedColor(color)}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: Spacing.lg,
                    borderRadius: BorderRadius.md,
                    backgroundColor: theme.backgroundTertiary,
                    alignItems: 'center',
                  }}
                  onPress={onClose}
                >
                  <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: Spacing.lg,
                    borderRadius: BorderRadius.md,
                    backgroundColor: theme.primary,
                    alignItems: 'center',
                  }}
                  onPress={handleSave}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>保存</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default function ExpenseCategoriesScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  const loadCategories = useCallback(async () => {
    const data = await ExpenseCategoryStorage.getAll();
    setCategories(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }, []);

  useEffect(() => {
    async function loadData() {
      await loadCategories();
    }
    loadData();
  }, [loadCategories]);

  const handleAdd = () => {
    setEditingCategory(null);
    setModalVisible(true);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setModalVisible(true);
  };

  const handleDelete = (category: ExpenseCategory) => {
    Alert.alert(
      '确认删除',
      `确定要删除分类"${category.name}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            const success = await ExpenseCategoryStorage.delete(category.id);
            if (success) {
              await loadCategories();
            } else {
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async (name: string, color: string) => {
    if (editingCategory) {
      // 编辑现有分类
      const updated: ExpenseCategory = {
        ...editingCategory,
        name,
        color,
        updatedAt: new Date().toISOString(),
      };
      const success = await ExpenseCategoryStorage.save(updated);
      if (success) {
        await loadCategories();
        setModalVisible(false);
      } else {
        Alert.alert('错误', '保存失败，请重试');
      }
    } else {
      // 新增分类
      const newCategory: ExpenseCategory = {
        id: generateUUID(),
        name,
        color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const success = await ExpenseCategoryStorage.save(newCategory);
      if (success) {
        await loadCategories();
        setModalVisible(false);
      } else {
        Alert.alert('错误', '保存失败，请重试');
      }
    }
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
          <TouchableOpacity style={{
            width: 32,
            height: 32,
            borderRadius: BorderRadius.sm,
            backgroundColor: theme.backgroundTertiary,
            justifyContent: 'center',
            alignItems: 'center',
          }} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary} style={{ flex: 1, marginLeft: Spacing.md }}>
            支出分类
          </ThemedText>
          <TouchableOpacity style={{
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            borderRadius: BorderRadius.md,
            backgroundColor: theme.primary,
          }} onPress={handleAdd}>
            <ThemedText variant="body" color={theme.buttonPrimaryText}>新增</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: Spacing['5xl'],
          flexGrow: 1,
        }}>
          {categories.length === 0 ? (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: Spacing['6xl'],
            }}>
              <FontAwesome6 name="tags" size={64} color={theme.textMuted} style={{ opacity: 0.5, marginBottom: Spacing.lg }} />
              <ThemedText variant="h4" color={theme.textSecondary} style={{ marginBottom: Spacing.sm }}>
                暂无支出分类
              </ThemedText>
              <ThemedText variant="body" color={theme.textMuted}>
                点击右上角&ldquo;新增&rdquo;按钮创建第一个分类
              </ThemedText>
            </View>
          ) : (
            <View style={{ gap: Spacing.md }}>
              {categories.map((category) => (
                <ThemedView key={category.id} level="default" style={{
                  borderRadius: BorderRadius.lg,
                  padding: Spacing.lg,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0px 2px 8px rgba(79, 70, 229, 0.08)',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: category.color,
                      marginRight: Spacing.md,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <FontAwesome6 name="tag" size={20} color="#FFFFFF" />
                    </View>
                    <ThemedText variant="h4" color={theme.textPrimary}>
                      {category.name}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: BorderRadius.sm,
                        backgroundColor: theme.backgroundTertiary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={() => handleEdit(category)}
                    >
                      <FontAwesome6 name="pen" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: BorderRadius.sm,
                        backgroundColor: theme.backgroundTertiary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={() => handleDelete(category)}
                    >
                      <FontAwesome6 name="trash" size={16} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
        </ScrollView>

        <CategoryFormModal
          visible={modalVisible}
          category={editingCategory}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveCategory}
        />
      </ThemedView>
    </Screen>
  );
}
