import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { DeliveryRecordStorage, ProjectStorage } from '@/utils/storage';
import { generateUUID, formatDate, formatCurrency } from '@/utils/helpers';
import { saveImageLocally, deleteLocalImage } from '@/utils/imageStorage';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { CustomAlert } from '@/components/CustomAlert';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { InvoiceStatus, InvoiceStatusNames } from '@/types';

// 开票状态选项组件
const InvoiceStatusOption = ({ value, label, status, onPress, theme }: { value: InvoiceStatus; label: string; status: InvoiceStatus; onPress: (value: InvoiceStatus) => void; theme: any }) => {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: status === value ? theme.primary : theme.backgroundTertiary,
        marginRight: 8,
      }}
      onPress={() => onPress(value)}
    >
      <View style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: status === value ? '#fff' : theme.textMuted,
        backgroundColor: status === value ? '#fff' : 'transparent',
        marginRight: 8,
      }} />
      <ThemedText
        variant="caption"
        color={status === value ? theme.buttonPrimaryText : theme.textSecondary}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
};

export default function EditDeliveryRecordScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [images, setImages] = useState<string[]>([]); // 本地图片路径
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  
  // 财务信息
  const [amount, setAmount] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('none');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  // 图片预览
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  // 自定义弹窗
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[];
  }>({ title: '', message: '', buttons: [] });

  const showCustomAlert = (
    title: string,
    message: string,
    buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[]
  ) => {
    setAlertConfig({ title, message, buttons });
    setAlertVisible(true);
  };

  // 加载送货记录数据
  useEffect(() => {
    let mounted = true;
    
    async function loadRecord() {
      console.log('送货记录编辑页面 - 接收到的 id:', id);
      if (!id) {
        Alert.alert('错误', '送货记录ID不存在');
        router.back();
        return;
      }

      const record = await DeliveryRecordStorage.getById(id);
      console.log('送货记录编辑页面 - 查询到的记录:', record ? record.description : 'null');
      if (!mounted) return;
      
      if (!record) {
        Alert.alert('错误', '送货记录不存在');
        router.back();
        return;
      }

      // 填充表单数据
      setDescription(record.description);
      setDate(record.date);
      setImages(record.images || []); // 使用本地路径
      setAmount(record.amount?.toString() || '');
      setInvoiceStatus(record.invoiceStatus || 'none');
      setInvoiceAmount(record.invoiceAmount?.toString() || '');
      setReceivedAmount(record.receivedAmount?.toString() || '');
      setProjectId(record.projectId);
      setProjectName(record.projectName || '');

      console.log('送货记录编辑页面 - 数据加载完成，设置 loading=false');
      setLoading(false);
    }
    loadRecord();
    
    return () => {
      mounted = false;
    };
  }, [id]); // 移除 router 依赖，避免重复触发

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
      // 保存到本地
      const localUri = await saveImageLocally(result.assets[0].uri);
      setImages(prev => [...prev, localUri].slice(0, 9));
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
      selectionLimit: 9 - images.length,
    });

    if (!result.canceled) {
      // 保存到本地
      for (const asset of result.assets) {
        const localUri = await saveImageLocally(asset.uri);
        setImages(prev => [...prev, localUri].slice(0, 9));
      }
    }
  }, [images.length]);

  // 删除图片
  const handleRemoveImage = useCallback(async (index: number) => {
    const uri = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    // 删除本地文件
    await deleteLocalImage(uri);
  }, [images]);

  // 查看图片
  const handleViewImage = useCallback((url: string) => {
    setPreviewImageUrl(url);
    setImagePreviewVisible(true);
  }, []);

  // 保存送货记录（直接使用本地路径，不上传）
  const handleSave = useCallback(async () => {
    if (!id) {
      Alert.alert('错误', '送货记录ID不存在');
      return;
    }

    if (!description.trim()) {
      Alert.alert('提示', '请输入送货描述');
      return;
    }

    if (images.length === 0) {
      Alert.alert('提示', '请至少保留一张图片');
      return;
    }

    setUploading(true);
    try {
      // 获取原记录
      const originalRecord = await DeliveryRecordStorage.getById(id);
      if (!originalRecord) {
        Alert.alert('错误', '送货记录不存在');
        return;
      }

      // 更新送货记录，直接使用本地路径
      const updatedRecord = {
        ...originalRecord,
        description: description.trim(),
        images: images, // 使用本地路径
        date: date || new Date().toISOString(),
        amount: parseFloat(amount) || 0,
        invoiceStatus,
        invoiceAmount: parseFloat(invoiceAmount) || 0,
        receivedAmount: parseFloat(receivedAmount) || 0,
        updatedAt: new Date().toISOString(),
      };

      const success = await DeliveryRecordStorage.save(updatedRecord);

      if (success) {
        router.back();
      } else {
        Alert.alert('错误', '保存失败，请重试');
      }
    } catch (error) {
      console.error('更新送货记录失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [id, description, date, amount, invoiceStatus, invoiceAmount, receivedAmount, images, router]);

  // 删除送货记录
  const handleDelete = useCallback(() => {
    showCustomAlert(
      '确认删除',
      '确定要删除这条送货记录吗？此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const success = await DeliveryRecordStorage.delete(id);
            if (success) {
              router.back();
            } else {
              showCustomAlert('错误', '删除失败，请重试', [{ text: '确定' }]);
            }
          },
        },
      ]
    );
  }, [id, router]);

  // 显示图片
  const handlePreviewImage = useCallback((uri: string) => {
    setPreviewImageUrl(uri);
    setImagePreviewVisible(true);
  }, []);

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ThemedView level="root" style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.headerTitle}>
              编辑送货记录
            </ThemedText>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </ThemedView>
      </Screen>
    );
  }

  const totalImages = images.length;

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.headerTitle}>
            编辑送货记录
          </ThemedText>
          <TouchableOpacity
            style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 项目信息 */}
          {projectName && (
            <ThemedView level="default" style={styles.infoCard}>
              <View style={styles.infoRow}>
                <FontAwesome6 name="box" size={16} color={theme.primary} />
                <ThemedText variant="body" color={theme.textPrimary} style={styles.infoText}>
                  {projectName}
                </ThemedText>
              </View>
            </ThemedView>
          )}

          {/* 送货信息 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              送货信息
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                送货描述 <ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入送货描述（如：送货内容、数量等）"
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                送货日期
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="格式：YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                value={date}
                onChangeText={setDate}
              />
            </View>
          </ThemedView>

          {/* 财务信息 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              财务信息
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                送货金额
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入送货金额"
                placeholderTextColor={theme.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              {amount && (
                <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 4 }}>
                  {formatCurrency(parseFloat(amount) || 0)}
                </ThemedText>
              )}
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                已收款金额
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入已收款金额"
                placeholderTextColor={theme.textMuted}
                value={receivedAmount}
                onChangeText={setReceivedAmount}
                keyboardType="numeric"
              />
              {receivedAmount && (
                <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 4 }}>
                  {formatCurrency(parseFloat(receivedAmount) || 0)}
                </ThemedText>
              )}
            </View>
          </ThemedView>

          {/* 开票信息 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              开票信息
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                开票状态
              </ThemedText>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                {(Object.keys(InvoiceStatusNames) as InvoiceStatus[]).map((key) => (
                  <InvoiceStatusOption
                    key={key}
                    value={key}
                    label={InvoiceStatusNames[key]}
                    status={invoiceStatus}
                    onPress={setInvoiceStatus}
                    theme={theme}
                  />
                ))}
              </View>
            </View>

            {invoiceStatus !== 'none' && (
              <View style={styles.formField}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                  已开票金额
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                  placeholder="请输入已开票金额"
                  placeholderTextColor={theme.textMuted}
                  value={invoiceAmount}
                  onChangeText={setInvoiceAmount}
                  keyboardType="numeric"
                />
                {invoiceAmount && (
                  <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 4 }}>
                    {formatCurrency(parseFloat(invoiceAmount) || 0)}
                  </ThemedText>
                )}
              </View>
            )}
          </ThemedView>

          {/* 图片管理 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              送货图片 <ThemedText style={{ color: theme.error }}>*</ThemedText>
            </ThemedText>

            {/* 图片列表 */}
            {images.length > 0 && (
              <View style={{ marginBottom: Spacing.md }}>
                <ThemedText variant="caption" color={theme.textMuted} style={{ marginBottom: Spacing.sm }}>
                  图片 ({images.length}张)
                </ThemedText>
                <View style={styles.imageGrid}>
                  {images.map((uri, index) => (
                    <View key={`img-${index}`} style={styles.imageWrapper}>
                      <TouchableOpacity onPress={() => handlePreviewImage(uri)} activeOpacity={0.9}>
                        <Image source={{ uri }} style={styles.previewImage} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <FontAwesome6 name="xmark" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 添加更多图片 */}
            {totalImages < 9 && (
              <View style={styles.imageActions}>
                <TouchableOpacity style={styles.imageActionButton} onPress={handleTakePhoto}>
                  <View style={[styles.imageActionIcon, { backgroundColor: theme.primary + '20' }]}>
                    <FontAwesome6 name="camera" size={24} color={theme.primary} />
                  </View>
                  <ThemedText variant="caption" color={theme.textSecondary}>拍照</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.imageActionButton} onPress={handlePickImage}>
                  <View style={[styles.imageActionIcon, { backgroundColor: theme.accent + '20' }]}>
                    <FontAwesome6 name="images" size={24} color={theme.accent} />
                  </View>
                  <ThemedText variant="caption" color={theme.textSecondary}>相册</ThemedText>
                </TouchableOpacity>
              </View>
            )}

            <ThemedText variant="caption" color={theme.textMuted} style={styles.imageHint}>
              点击图片可放大查看，最多可添加9张图片
            </ThemedText>
          </ThemedView>

          {/* 删除按钮 */}
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <FontAwesome6 name="trash" size={16} color={theme.error} style={{ marginRight: 8 }} />
            <ThemedText variant="body" color={theme.error}>删除送货记录</ThemedText>
          </TouchableOpacity>

          <View style={{ height: Spacing['5xl'] }} />
        </ScrollView>

        {/* 图片预览模态框 */}
        <Modal
          visible={imagePreviewVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImagePreviewVisible(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setImagePreviewVisible(false)}
            >
              <FontAwesome6 name="xmark" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Image 
              source={{ uri: previewImageUrl }} 
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>
        </Modal>

        {/* 自定义弹窗 */}
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />
      </ThemedView>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return {
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center' as const,
    },
    saveButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    scrollContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing['5xl'],
    },
    infoCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    infoRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.sm,
    },
    infoText: {
      flex: 1,
    },
    formCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    formTitle: {
      marginBottom: Spacing.lg,
    },
    formField: {
      marginBottom: Spacing.lg,
    },
    fieldLabel: {
      marginBottom: Spacing.sm,
    },
    input: {
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      fontSize: 16,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top' as const,
    },
    imageActions: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      gap: Spacing['2xl'],
      marginBottom: Spacing.lg,
    },
    imageActionButton: {
      alignItems: 'center' as const,
    },
    imageActionIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: Spacing.sm,
    },
    imageGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: Spacing.sm,
    },
    imageWrapper: {
      width: 100,
      height: 100,
      borderRadius: BorderRadius.md,
      overflow: 'hidden' as const,
    },
    previewImage: {
      width: '100%' as const,
      height: '100%' as const,
      resizeMode: 'cover' as const,
    },
    removeImageButton: {
      position: 'absolute' as const,
      top: 4,
      right: 4,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    imageHint: {
      textAlign: 'center' as const,
    },
    deleteButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.error + '15',
      marginTop: Spacing.md,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    modalCloseButton: {
      position: 'absolute' as const,
      top: 60,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 10,
    },
    modalImage: {
      width: '100%' as const,
      height: '80%' as const,
    },
  };
}
