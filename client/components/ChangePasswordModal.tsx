import React, { useState, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { PasswordStorage } from '@/utils/password';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const { theme } = useTheme();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetState = useCallback(() => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleChangePassword = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!oldPassword) {
      setError('请输入原密码');
      return;
    }

    if (newPassword.length < 4) {
      setError('新密码至少需要4位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      const result = await PasswordStorage.changePassword(oldPassword, newPassword);
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError('修改密码失败');
    } finally {
      setIsLoading(false);
    }
  }, [oldPassword, newPassword, confirmPassword, handleClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing.lg,
        }}>
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
              marginBottom: Spacing.xl,
            }}>
              <ThemedText variant="h3" color={theme.textPrimary}>
                修改密码
              </ThemedText>
              <TouchableOpacity onPress={handleClose} style={{ padding: Spacing.sm }}>
                <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 原密码 */}
            <View style={{ marginBottom: Spacing.lg }}>
              <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.sm }}>
                原密码
              </ThemedText>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.backgroundTertiary,
                borderRadius: BorderRadius.md,
                paddingHorizontal: Spacing.lg,
                height: 48,
              }}>
                <FontAwesome6 name="lock" size={16} color={theme.textMuted} style={{ marginRight: Spacing.md }} />
                <TextInput
                  style={{ flex: 1, color: theme.textPrimary, fontSize: 16 }}
                  placeholder="请输入原密码"
                  placeholderTextColor={theme.textMuted}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={20}
                />
              </View>
            </View>

            {/* 新密码 */}
            <View style={{ marginBottom: Spacing.lg }}>
              <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.sm }}>
                新密码
              </ThemedText>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.backgroundTertiary,
                borderRadius: BorderRadius.md,
                paddingHorizontal: Spacing.lg,
                height: 48,
              }}>
                <FontAwesome6 name="key" size={16} color={theme.textMuted} style={{ marginRight: Spacing.md }} />
                <TextInput
                  style={{ flex: 1, color: theme.textPrimary, fontSize: 16 }}
                  placeholder="请输入新密码（至少4位）"
                  placeholderTextColor={theme.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={20}
                />
              </View>
            </View>

            {/* 确认新密码 */}
            <View style={{ marginBottom: Spacing.lg }}>
              <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.sm }}>
                确认新密码
              </ThemedText>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.backgroundTertiary,
                borderRadius: BorderRadius.md,
                paddingHorizontal: Spacing.lg,
                height: 48,
              }}>
                <FontAwesome6 name="check-double" size={16} color={theme.textMuted} style={{ marginRight: Spacing.md }} />
                <TextInput
                  style={{ flex: 1, color: theme.textPrimary, fontSize: 16 }}
                  placeholder="请再次输入新密码"
                  placeholderTextColor={theme.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={handleChangePassword}
                />
              </View>
            </View>

            {/* 错误提示 */}
            {error ? (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: Spacing.md,
                paddingHorizontal: Spacing.sm,
              }}>
                <FontAwesome6 name="circle-exclamation" size={14} color={theme.error} />
                <ThemedText variant="body" color={theme.error} style={{ marginLeft: Spacing.sm }}>
                  {error}
                </ThemedText>
              </View>
            ) : null}

            {/* 成功提示 */}
            {success ? (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: Spacing.md,
                paddingHorizontal: Spacing.sm,
              }}>
                <FontAwesome6 name="circle-check" size={14} color={theme.success} />
                <ThemedText variant="body" color={theme.success} style={{ marginLeft: Spacing.sm }}>
                  {success}
                </ThemedText>
              </View>
            ) : null}

            {/* 按钮 */}
            <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: BorderRadius.md,
                  backgroundColor: theme.backgroundTertiary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={handleClose}
              >
                <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: BorderRadius.md,
                  backgroundColor: theme.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={handleChangePassword}
                disabled={isLoading}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>
                  {isLoading ? '处理中...' : '确认修改'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
