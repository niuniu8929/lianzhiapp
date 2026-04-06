import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Modal, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Alert, FlatList, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Transaction, Project, ExpenseCategory } from '@/types';
import { TransactionStorage, ProjectStorage, ExpenseCategoryStorage } from '@/utils/storage';
import { formatDate } from '@/utils/helpers';
import { saveImagesLocally } from '@/utils/imageStorage';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

const createStyles = (theme: Theme) => StyleSheet.create({
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
  deleteButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    flexGrow: 1,
  },
  formCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    boxShadow: '0px 2px 8px rgba(79, 70, 229, 0.08)',
  },
  formTitle: {
    marginBottom: Spacing.md,
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  selectButtonText: {
    flex: 1,
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
  dateOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  // 图片相关样式
  imageSection: {
    marginTop: Spacing.sm,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  // 开票开关样式
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  // 图片查看器
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullScreenImage: {
    width: '90%',
    height: '70%',
    borderRadius: BorderRadius.md,
  },
});

export default function EditExpenseScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  
  // 新增字段
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [isInvoiced, setIsInvoiced] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // 图片查看器状态
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string>('');

  const handleImagePress = useCallback((uri: string) => {
    setCurrentImageUri(uri);
    setImageViewerVisible(true);
  }, []);

  // 加载数据
  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      if (!id) {
        Alert.alert('错误', '支出记录不存在');
        router.back();
        return;
      }

      const [txData, projData, catData] = await Promise.all([
        TransactionStorage.getById(id),
        ProjectStorage.getAll(),
        ExpenseCategoryStorage.getAll(),
      ]);

      if (!isMounted) return;

      if (!txData) {
        Alert.alert('错误', '支出记录不存在');
        router.back();
        return;
      }

      setTransaction(txData);
      setProjects(projData);
      setCategories(catData);

      // 填充表单数据
      setSelectedProjectId(txData.projectId);
      setSelectedCategoryId(txData.categoryId || null);
      setAmount(txData.amount.toString());
      setDescription(txData.description);
      setDate(txData.date);
      setPurchaseUnit(txData.purchaseUnit || '');
      setIsInvoiced(txData.isInvoiced || false);
      setIsPaid(txData.isPaid || false);
      setExistingImages(txData.images || []);
      
      setLoading(false);
    }
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [id]);

  // 拍照
  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机权限才能拍照');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  }, []);

  // 从相册选择
  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册权限才能选择图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: 9,
    });

    if (!result.canceled) {
      const newUris = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newUris].slice(0, 9));
    }
  }, []);

  // 删除新添加的图片
  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 删除已存在的图片
  const handleRemoveExistingImage = useCallback((index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = async () => {
    if (!transaction || !selectedProjectId) {
      Alert.alert('错误', '数据不完整');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('提示', '请输入有效的金额');
      return;
    }

    if (!description.trim()) {
      Alert.alert('提示', '请输入描述');
      return;
    }

    setUploading(true);
    try {
      // 保存新图片到本地（不再上传服务器）
      let savedImageUris: string[] = [];
      if (images.length > 0) {
        savedImageUris = await saveImagesLocally(images);
      }

      // 合并已存在的图片和新保存的图片
      const allImages = [...existingImages, ...savedImageUris];

      const updatedTransaction: Transaction = {
        ...transaction,
        projectId: selectedProjectId,
        amount: amountValue,
        description: description.trim(),
        date,
        categoryId: selectedCategoryId || undefined,
        purchaseUnit: purchaseUnit.trim() || undefined,
        isInvoiced,
        isPaid,
        images: allImages.length > 0 ? allImages : undefined,
        updatedAt: new Date().toISOString(),
      };

      const success = await TransactionStorage.update(updatedTransaction);
      if (success) {
        router.back();
      } else {
        Alert.alert('错误', '保存失败，请重试');
      }
    } catch (error) {
      console.error('保存支出失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    Alert.alert(
      '确认删除',
      '确定要删除这条支出记录吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            const success = await TransactionStorage.delete(transaction.id);
            if (success) {
              router.back();
            } else {
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ThemedView level="root" style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.backgroundTertiary }]} onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.headerTitle}>
              编辑支出
            </ThemedText>
            <View style={{ width: 32 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
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
            编辑支出
          </ThemedText>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: theme.error + '20' }]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <ThemedText variant="body" color={theme.error}>删除</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: uploading ? theme.textMuted : theme.primary }]} 
              onPress={handleSave}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
              ) : (
                <ThemedText variant="body" color={theme.buttonPrimaryText}>保存</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              基本信息
            </ThemedText>
            
            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                选择项目<ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <TouchableOpacity
                style={[styles.selectButton, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => setShowProjectSelector(true)}
              >
                <FontAwesome6 name="folder" size={18} color={theme.textSecondary} />
                <ThemedText variant="body" color={selectedProjectId ? theme.textPrimary : theme.textMuted} style={styles.selectButtonText}>
                  {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name || '请选择项目' : '请选择项目'}
                </ThemedText>
                <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {categories.length > 0 && (
              <View style={styles.formField}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                  支出分类
                </ThemedText>
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => setShowCategorySelector(true)}
                >
                  <FontAwesome6 name="tag" size={18} color={theme.textSecondary} />
                  <ThemedText variant="body" color={selectedCategoryId ? theme.textPrimary : theme.textMuted} style={styles.selectButtonText}>
                    {selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name || '不分类' : '不分类'}
                  </ThemedText>
                  <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
                </TouchableOpacity>
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
                placeholder="请输入支出描述"
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

          {/* 新增字段卡片 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              附加信息
            </ThemedText>
            
            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                采购单位
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入采购单位（选填）"
                placeholderTextColor={theme.textMuted}
                value={purchaseUnit}
                onChangeText={setPurchaseUnit}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                是否开票
              </ThemedText>
              <TouchableOpacity
                style={[styles.switchRow, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => setIsInvoiced(!isInvoiced)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <FontAwesome6
                    name={isInvoiced ? "circle-check" : "circle"}
                    size={20}
                    color={isInvoiced ? theme.success : theme.textMuted}
                  />
                  <ThemedText variant="body" color={theme.textPrimary}>
                    {isInvoiced ? '已开票' : '未开票'}
                  </ThemedText>
                </View>
                <View style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isInvoiced ? theme.success : theme.border,
                  padding: 2,
                  justifyContent: 'center',
                }}>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#fff',
                    transform: [{ translateX: isInvoiced ? 20 : 0 }],
                  }} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                是否付款
              </ThemedText>
              <TouchableOpacity
                style={[styles.switchRow, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => setIsPaid(!isPaid)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <FontAwesome6
                    name={isPaid ? "circle-check" : "circle"}
                    size={20}
                    color={isPaid ? theme.primary : theme.textMuted}
                  />
                  <ThemedText variant="body" color={theme.textPrimary}>
                    {isPaid ? '已付款' : '未付款'}
                  </ThemedText>
                </View>
                <View style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isPaid ? theme.primary : theme.border,
                  padding: 2,
                  justifyContent: 'center',
                }}>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#fff',
                    transform: [{ translateX: isPaid ? 20 : 0 }],
                  }} />
                </View>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* 图片上传卡片 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              图片凭证
            </ThemedText>
            
            <View style={styles.imageSection}>
              <View style={styles.imageRow}>
                {/* 已存在的图片 */}
                {existingImages.map((uri, index) => (
                  <TouchableOpacity 
                    key={`existing-${index}`} 
                    style={styles.imageContainer}
                    onPress={() => handleImagePress(uri)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveExistingImage(index);
                      }}
                    >
                      <FontAwesome6 name="xmark" size={12} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                
                {/* 新添加的图片 */}
                {images.map((uri, index) => (
                  <TouchableOpacity 
                    key={`new-${index}`} 
                    style={styles.imageContainer}
                    onPress={() => handleImagePress(uri)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(index);
                      }}
                    >
                      <FontAwesome6 name="xmark" size={12} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                
                {(existingImages.length + images.length) < 9 && (
                  <TouchableOpacity
                    style={[styles.addImageButton, { borderColor: theme.border }]}
                    onPress={() => {
                      Alert.alert(
                        '选择图片',
                        '请选择图片来源',
                        [
                          { text: '拍照', onPress: handleTakePhoto },
                          { text: '从相册选择', onPress: handlePickImage },
                          { text: '取消', style: 'cancel' },
                        ]
                      );
                    }}
                  >
                    <FontAwesome6 name="plus" size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              
              {(existingImages.length + images.length) === 0 && (
                <View style={styles.imageActionsRow}>
                  <TouchableOpacity
                    style={[styles.imageActionButton, { backgroundColor: theme.backgroundTertiary }]}
                    onPress={handleTakePhoto}
                  >
                    <FontAwesome6 name="camera" size={16} color={theme.textSecondary} />
                    <ThemedText variant="caption" color={theme.textSecondary}>拍照</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.imageActionButton, { backgroundColor: theme.backgroundTertiary }]}
                    onPress={handlePickImage}
                  >
                    <FontAwesome6 name="images" size={16} color={theme.textSecondary} />
                    <ThemedText variant="caption" color={theme.textSecondary}>相册</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ThemedView>
        </ScrollView>

        {/* 日期选择 Modal */}
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

                  <ScrollView>
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

        {/* 项目选择 Modal */}
        <Modal
          visible={showProjectSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProjectSelector(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setShowProjectSelector(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h4" color={theme.textPrimary}>选择项目</ThemedText>
                <TouchableOpacity onPress={() => setShowProjectSelector(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={projects}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[styles.optionItem, index === projects.length - 1 && styles.optionItemLast, selectedProjectId === item.id && { backgroundColor: theme.primary + '20' }]}
                    onPress={() => {
                      setSelectedProjectId(item.id);
                      setShowProjectSelector(false);
                    }}
                  >
                    <FontAwesome6 name="folder" size={18} color={selectedProjectId === item.id ? theme.primary : theme.textSecondary} />
                    <ThemedText variant="body" color={theme.textPrimary} style={{ marginLeft: Spacing.md, flex: 1 }}>
                      {item.name}
                    </ThemedText>
                    {selectedProjectId === item.id && (
                      <FontAwesome6 name="check" size={18} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 分类选择 Modal */}
        <Modal
          visible={showCategorySelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCategorySelector(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setShowCategorySelector(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h4" color={theme.textPrimary}>选择分类</ThemedText>
                <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[{ id: null, name: '不分类', color: theme.textSecondary }, ...categories]}
                keyExtractor={(item) => item.id || 'none'}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[styles.optionItem, index === categories.length && styles.optionItemLast, selectedCategoryId === item.id && { backgroundColor: item.id === null ? theme.primary + '20' : item.color + '20' }]}
                    onPress={() => {
                      setSelectedCategoryId(item.id);
                      setShowCategorySelector(false);
                    }}
                  >
                    {item.id === null ? (
                      <FontAwesome6 name="tag" size={18} color={selectedCategoryId === null ? theme.primary : theme.textSecondary} />
                    ) : (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                    )}
                    <ThemedText variant="body" color={theme.textPrimary} style={{ marginLeft: Spacing.md, flex: 1 }}>
                      {item.name}
                    </ThemedText>
                    {(selectedCategoryId === item.id || (selectedCategoryId === null && item.id === null)) && (
                      <FontAwesome6 name="check" size={18} color={item.id === null ? theme.primary : item.color} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 图片查看器 Modal */}
        <Modal
          visible={imageViewerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageViewerVisible(false)}
        >
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setImageViewerVisible(false)}
            >
              <FontAwesome6 name="xmark" size={28} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: currentImageUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </ThemedView>
    </Screen>
  );
}
