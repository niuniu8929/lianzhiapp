import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { DeliveryRecordStorage, ProjectStorage } from '@/utils/storage';
import { generateUUID, formatDate, formatCurrency } from '@/utils/helpers';
import { saveImageLocally, deleteLocalImage } from '@/utils/imageStorage';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
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

export default function AddDeliveryRecordScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { projectId } = useSafeSearchParams<{ projectId: string }>();

  const [description, setDescription] = useState('');
  const [date, setDate] = useState(formatDate(new Date().toISOString()));
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isNewProject, setIsNewProject] = useState(false); // 是否是新建项目模式

  // 财务信息
  const [amount, setAmount] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('none');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  // 加载项目信息
  React.useEffect(() => {
    async function loadProject() {
      console.log('送货记录添加页面，项目ID:', projectId);
      if (!projectId) {
        // 没有项目ID，说明是新建项目模式
        console.log('新建项目模式');
        setIsNewProject(true);
        return;
      }
      const project = await ProjectStorage.getById(projectId);
      if (project) {
        console.log('加载项目成功:', project.name);
        setProjectName(project.name);
        setIsNewProject(false);
      } else {
        console.log('警告：项目不存在');
      }
    }
    loadProject();
  }, [projectId]);

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
      setImages(prev => [...prev, localUri]);
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
      // 保存到本地
      for (const asset of result.assets) {
        const localUri = await saveImageLocally(asset.uri);
        setImages(prev => [...prev, localUri].slice(0, 9)); // 最多9张
      }
    }
  }, []);

  // 删除图片
  const handleRemoveImage = useCallback(async (index: number) => {
    const uri = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    // 删除本地文件
    await deleteLocalImage(uri);
  }, [images]);

  // 保存送货记录（直接使用本地路径，不上传）
  const handleSave = useCallback(async () => {
    // 新建项目模式下，需要验证项目名称
    if (isNewProject && !projectName.trim()) {
      Alert.alert('提示', '请输入项目名称');
      return;
    }

    if (!description.trim()) {
      Alert.alert('提示', '请输入送货描述');
      return;
    }

    if (images.length === 0) {
      Alert.alert('提示', '请至少添加一张图片');
      return;
    }

    setUploading(true);
    try {
      let finalProjectId = projectId;
      let finalProjectName = projectName;

      // 如果是新建项目模式，先创建项目
      if (isNewProject) {
        const newProjectId = generateUUID();
        const newProject = {
          id: newProjectId,
          name: projectName.trim(),
          projectType: 'delivery' as const,
          status: 'active' as const,
          invoiceStatus: 'none' as const,
          contractAmount: 0,
          deliveryAmount: parseFloat(amount) || 0,
          receivedAmount: parseFloat(receivedAmount) || 0,
          invoiceAmount: parseFloat(invoiceAmount) || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const projectSuccess = await ProjectStorage.save(newProject);
        if (!projectSuccess) {
          Alert.alert('错误', '创建项目失败，请重试');
          setUploading(false);
          return;
        }

        finalProjectId = newProjectId;
        finalProjectName = projectName.trim();
      }

      // 创建送货记录
      const record = {
        id: generateUUID(),
        projectId: finalProjectId!,
        projectName: finalProjectName,
        description: description.trim(),
        images: images, // 使用本地路径
        date: date || new Date().toISOString(),
        amount: parseFloat(amount) || 0,
        invoiceStatus,
        invoiceAmount: parseFloat(invoiceAmount) || 0,
        receivedAmount: parseFloat(receivedAmount) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const success = await DeliveryRecordStorage.save(record);

      if (success) {
        router.back();
      } else {
        Alert.alert('错误', '保存失败，请重试');
      }
    } catch (error) {
      console.error('保存送货记录失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [projectId, projectName, isNewProject, description, date, amount, invoiceStatus, invoiceAmount, receivedAmount, images, router]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.headerTitle}>
            {isNewProject ? '新增零星采购' : '添加送货记录'}
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
          {/* 项目名称 - 新建项目模式下显示输入框 */}
          {isNewProject ? (
            <ThemedView level="default" style={styles.formCard}>
              <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
                项目名称
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                value={projectName}
                onChangeText={setProjectName}
                placeholder="请输入项目名称"
                placeholderTextColor={theme.textMuted}
              />
            </ThemedView>
          ) : (
            /* 已有项目信息 */
            projectName && (
              <ThemedView level="default" style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <FontAwesome6 name="box" size={16} color={theme.primary} />
                  <ThemedText variant="body" color={theme.textPrimary} style={styles.infoText}>
                    {projectName}
                  </ThemedText>
                </View>
              </ThemedView>
            )
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

            {/* 已收款金额 */}
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

          {/* 图片上传 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              送货图片 <ThemedText style={{ color: theme.error }}>*</ThemedText>
            </ThemedText>

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

            {images.length > 0 && (
              <View style={styles.imageGrid}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <FontAwesome6 name="xmark" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <ThemedText variant="caption" color={theme.textMuted} style={styles.imageHint}>
              最多可添加9张图片，图片保存在本地
            </ThemedText>
          </ThemedView>

          <View style={{ height: Spacing['5xl'] }} />
        </ScrollView>
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
      marginBottom: Spacing.md,
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
  };
}
