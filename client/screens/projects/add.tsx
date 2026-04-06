import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { ProjectStorage } from '@/utils/storage';
import { generateUUID, normalizeDateString } from '@/utils/helpers';
import { saveImageLocally, deleteLocalImage } from '@/utils/imageStorage';
import { Project, ProjectStatus, InvoiceStatus, ProjectType } from '@/types';
import { ProjectStatusNames, InvoiceStatusNames, ProjectTypeNames } from '@/types';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

const StatusOption = ({ value, label, status, onPress }: { value: ProjectStatus; label: string; status: ProjectStatus; onPress: (value: ProjectStatus) => void }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <TouchableOpacity
      style={[styles.statusOption, status === value && styles.statusOptionSelected]}
      onPress={() => onPress(value)}
    >
      <View style={[styles.statusRadio, status === value && styles.statusRadioSelected]} />
      <ThemedText
        variant="body"
        color={status === value ? theme.buttonPrimaryText : theme.textSecondary}
        style={styles.statusLabel}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
};

const InvoiceStatusOption = ({ value, label, status, onPress }: { value: InvoiceStatus; label: string; status: InvoiceStatus; onPress: (value: InvoiceStatus) => void }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <TouchableOpacity
      style={[styles.statusOption, status === value && styles.statusOptionSelected]}
      onPress={() => onPress(value)}
    >
      <View style={[styles.statusRadio, status === value && styles.statusRadioSelected]} />
      <ThemedText
        variant="body"
        color={status === value ? theme.buttonPrimaryText : theme.textSecondary}
        style={styles.statusLabel}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
};

const ProjectTypeOption = ({ value, label, selectedType, onPress }: { value: ProjectType; label: string; selectedType: ProjectType; onPress: (value: ProjectType) => void }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <TouchableOpacity
      style={[styles.statusOption, selectedType === value && styles.statusOptionSelected]}
      onPress={() => onPress(value)}
    >
      <View style={[styles.statusRadio, selectedType === value && styles.statusRadioSelected]} />
      <ThemedText
        variant="body"
        color={selectedType === value ? theme.buttonPrimaryText : theme.textSecondary}
        style={styles.statusLabel}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
};

export default function AddProjectScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ projectType?: 'contract' | 'delivery' }>();

  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>((params.projectType as ProjectType) || 'contract');
  const [description, setDescription] = useState('');
  const [manager, setManager] = useState('');
  const [endDate, setEndDate] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [deliveryAmount, setDeliveryAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('none');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');

  // 合同图片
  const [contractImages, setContractImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 拍照
  const takePhoto = useCallback(async () => {
    try {
      // 检查相机权限
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        alert('需要相机权限才能拍照');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const image = result.assets[0];
      // 保存到本地
      const localUri = await saveImageLocally(image.uri);
      setContractImages(prev => [...prev, localUri]);
    } catch (error) {
      console.error('拍照失败:', error);
      alert('拍照失败，请重试');
    }
  }, []);

  // 从相册选择
  const pickImage = useCallback(async () => {
    try {
      // 检查相册权限
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libraryStatus !== 'granted') {
        alert('需要相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      // 保存所有选中的图片到本地
      for (const image of result.assets) {
        const localUri = await saveImageLocally(image.uri);
        setContractImages(prev => [...prev, localUri]);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      alert('选择图片失败，请重试');
    }
  }, []);

  // 删除图片
  const removeImage = useCallback(async (index: number) => {
    const uri = contractImages[index];
    setContractImages(prev => prev.filter((_, i) => i !== index));
    // 删除本地文件
    await deleteLocalImage(uri);
  }, [contractImages]);

  // 预览图片
  const openPreview = useCallback((uri: string) => {
    setPreviewImage(uri);
    setPreviewVisible(true);
  }, []);

  // 处理状态变更，已完成状态需要验证收款金额
  const handleStatusChange = useCallback((newStatus: ProjectStatus) => {
    if (newStatus === 'completed' && projectType === 'contract') {
      // 工程项目：检查已收款金额是否等于合同金额
      const contract = parseFloat(contractAmount) || 0;
      const received = parseFloat(receivedAmount) || 0;
      if (contract > 0 && received < contract) {
        alert(`无法标记为已完成：收款金额（¥${received.toLocaleString()}）未达到合同金额（¥${contract.toLocaleString()}）`);
        return;
      }
    }
    setStatus(newStatus);
  }, [projectType, contractAmount, receivedAmount]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      alert('请输入项目名称');
      return;
    }

    const receivedAmountValue = parseFloat(receivedAmount) || 0;
    if (receivedAmountValue < 0) {
      alert('请输入有效的已收款金额');
      return;
    }

    const invoiceAmountValue = parseFloat(invoiceAmount) || 0;
    if (invoiceAmountValue < 0) {
      alert('请输入有效的开票金额');
      return;
    }

    const newProject: Project = {
      id: generateUUID(),
      name: name.trim(),
      projectType,
      description: description.trim() || undefined,
      manager: manager.trim() || undefined,
      endDate: normalizeDateString(endDate) || undefined,
      contractAmount: projectType === 'contract' && contractAmount.trim() ? parseFloat(contractAmount) : undefined,
      deliveryAmount: projectType === 'delivery' && deliveryAmount.trim() ? parseFloat(deliveryAmount) : undefined,
      receivedAmount: receivedAmountValue,
      settlementAmount: settlementAmount.trim() ? parseFloat(settlementAmount) : undefined,
      invoiceStatus,
      invoiceAmount: invoiceAmountValue,
      status,
      // 合同图片（仅工程项目）
      contractImages: projectType === 'contract' && contractImages.length > 0 ? contractImages : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('准备保存新项目:', JSON.stringify(newProject, null, 2));

    const success = await ProjectStorage.save(newProject);
    console.log('保存结果:', success);

    if (success) {
      router.back();
    } else {
      alert('保存失败，请重试');
    }
  }, [name, projectType, description, manager, endDate, settlementAmount, contractAmount, deliveryAmount, receivedAmount, invoiceStatus, invoiceAmount, status, contractImages, router]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.headerTitle}>
            新增项目
          </ThemedText>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <ThemedText variant="body" color={theme.buttonPrimaryText}>保存</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 基本信息 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              基本信息
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                项目名称 <ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入项目名称"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* 项目类型选择 */}
            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                项目类型 <ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <View style={styles.statusContainer}>
                {(Object.keys(ProjectTypeNames) as ProjectType[]).map((key) => (
                  <ProjectTypeOption 
                    key={key} 
                    value={key} 
                    label={ProjectTypeNames[key]} 
                    selectedType={projectType}
                    onPress={setProjectType}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                项目描述
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入项目描述（可选）"
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                项目负责人
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入负责人姓名"
                placeholderTextColor={theme.textMuted}
                value={manager}
                onChangeText={setManager}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                项目状态
              </ThemedText>
              <View style={styles.statusContainer}>
                {(Object.keys(ProjectStatusNames) as ProjectStatus[]).map((key) => (
                  <StatusOption
                    key={key}
                    value={key}
                    label={ProjectStatusNames[key]}
                    status={status}
                    onPress={handleStatusChange}
                  />
                ))}
              </View>
            </View>
          </ThemedView>

          {/* 合同图片（仅工程项目显示） */}
          {projectType === 'contract' && (
            <ThemedView level="default" style={styles.formCard}>
              <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
                合同图片
              </ThemedText>

              {/* 图片网格 */}
              {contractImages.length > 0 && (
                <View style={styles.imageGrid}>
                  {contractImages.map((uri, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.imageItem}
                      onPress={() => openPreview(uri)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri }} style={styles.imageThumbnail} resizeMode="cover" />
                      <TouchableOpacity
                        style={[styles.imageDeleteBtn, { backgroundColor: theme.error }]}
                        onPress={() => removeImage(index)}
                      >
                        <FontAwesome6 name="xmark" size={12} color="#fff" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 操作按钮 */}
              <View style={styles.imageActions}>
                <TouchableOpacity 
                  style={[styles.imageActionBtn, { backgroundColor: theme.primary }]}
                  onPress={takePhoto}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <FontAwesome6 name="camera" size={20} color="#fff" />
                      <ThemedText variant="body" color="#fff" style={styles.imageActionText}>
                        拍照
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.imageActionBtn, { backgroundColor: theme.success }]}
                  onPress={pickImage}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <FontAwesome6 name="images" size={20} color="#fff" />
                      <ThemedText variant="body" color="#fff" style={styles.imageActionText}>
                        相册
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <ThemedText variant="caption" color={theme.textMuted} style={{ textAlign: 'center', marginTop: Spacing.sm }}>
                点击缩略图可查看大图
              </ThemedText>
            </ThemedView>
          )}

          {/* 财务信息 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              财务信息
            </ThemedText>

            {/* 合同项目显示合同金额 */}
            {projectType === 'contract' && (
              <View style={styles.formField}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                  合同金额
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                  placeholder="请输入合同金额"
                  placeholderTextColor={theme.textMuted}
                  value={contractAmount}
                  onChangeText={setContractAmount}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* 送货项目显示送货总额 */}
            {projectType === 'delivery' && (
              <View style={styles.formField}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                  送货总额
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                  placeholder="请输入送货总金额"
                  placeholderTextColor={theme.textMuted}
                  value={deliveryAmount}
                  onChangeText={setDeliveryAmount}
                  keyboardType="numeric"
                />
              </View>
            )}

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
            </View>

            {projectType === 'contract' && (
              <View style={styles.formField}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                  结算金额
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                  placeholder="请输入结算金额（可选）"
                  placeholderTextColor={theme.textMuted}
                  value={settlementAmount}
                  onChangeText={setSettlementAmount}
                  keyboardType="numeric"
                />
              </View>
            )}
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
              <View style={styles.statusContainer}>
                {(Object.keys(InvoiceStatusNames) as InvoiceStatus[]).map((key) => (
                  <InvoiceStatusOption 
                    key={key} 
                    value={key} 
                    label={InvoiceStatusNames[key]} 
                    status={invoiceStatus}
                    onPress={setInvoiceStatus}
                  />
                ))}
              </View>
            </View>

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
            </View>
          </ThemedView>

          {/* 日期信息 */}
          <ThemedView level="default" style={styles.formCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.formTitle}>
              日期信息
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.fieldLabel}>
                {projectType === 'delivery' ? '送货日期' : '工程竣工日期'}
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                placeholder="请输入日期，格式：YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </ThemedView>
        </ScrollView>
      </ThemedView>

      {/* 图片预览弹窗 */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity 
            style={styles.previewCloseBtn}
            onPress={() => setPreviewVisible(false)}
          >
            <FontAwesome6 name="xmark" size={24} color="#fff" />
          </TouchableOpacity>
          {previewImage && (
            <Image 
              source={{ uri: previewImage }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </Screen>
  );
}
