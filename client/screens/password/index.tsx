import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { PasswordStorage, PasswordVerifyResult } from '@/utils/password';

interface PasswordScreenProps {
  mode: 'set' | 'verify';
  onSuccess: (isSuperPassword?: boolean) => void;
}

export default function PasswordScreen({ mode, onSuccess }: PasswordScreenProps) {
  const { theme, isDark } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 清除错误
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 设置密码
  const handleSetPassword = useCallback(async () => {
    console.log('handleSetPassword called');
    
    // 清除之前的错误
    setError('');
    
    if (password.length < 4) {
      setError('密码至少需要4位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Calling PasswordStorage.setPassword...');
      const success = await PasswordStorage.setPassword(password);
      console.log('setPassword result:', success);
      if (success) {
        console.log('Password set success, calling onSuccess...');
        onSuccess(false);
      } else {
        setError('设置密码失败，请重试');
      }
    } catch (e) {
      console.error('Set password error:', e);
      setError('设置密码失败');
    } finally {
      setIsLoading(false);
    }
  }, [password, confirmPassword, onSuccess]);

  // 验证密码
  const handleVerifyPassword = useCallback(async () => {
    console.log('handleVerifyPassword called');
    setError('');
    
    if (!password) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Calling PasswordStorage.verifyPassword...');
      const result: PasswordVerifyResult = await PasswordStorage.verifyPassword(password);
      console.log('verifyPassword result:', result);
      if (result.success) {
        console.log('Password verified, isSuperPassword:', result.isSuperPassword);
        onSuccess(result.isSuperPassword);
      } else {
        setError('密码错误，请重试');
        setPassword('');
      }
    } catch (e) {
      console.error('Verify password error:', e);
      setError('验证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [password, onSuccess]);

  const handleButtonPress = useCallback(() => {
    console.log('Button pressed, mode:', mode);
    if (mode === 'set') {
      handleSetPassword();
    } else {
      handleVerifyPassword();
    }
  }, [mode, handleSetPassword, handleVerifyPassword]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: Spacing['2xl'],
            paddingTop: Spacing['6xl'],
            paddingBottom: Spacing['3xl'],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo 区域 */}
          <View style={{ alignItems: 'center', marginBottom: Spacing['3xl'] }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: BorderRadius.xl,
              backgroundColor: theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: Spacing.lg,
            }}>
              <FontAwesome6 name="lock" size={40} color="#fff" />
            </View>
            <ThemedText variant="h2" color={theme.textPrimary} style={{ marginBottom: Spacing.sm }}>
              联智记帐
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={{ textAlign: 'center' }}>
              {mode === 'set' ? '首次使用，请设置访问密码' : '请输入密码以继续'}
            </ThemedText>
          </View>

          {/* 输入区域 */}
          <View style={{ marginTop: Spacing.xl }}>
            {mode === 'set' ? (
              <>
                <View style={{ marginBottom: Spacing.xl }}>
                  <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.sm }}>
                    设置密码
                  </ThemedText>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.backgroundTertiary,
                    borderColor: theme.border,
                    borderRadius: BorderRadius.lg,
                    borderWidth: 1,
                    paddingHorizontal: Spacing.lg,
                    height: 56,
                  }}>
                    <FontAwesome6 name="key" size={18} color={theme.textMuted} style={{ marginRight: Spacing.md }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, color: theme.textPrimary, height: '100%' }}
                      placeholder="请输入密码（至少4位，支持数字和英文）"
                      placeholderTextColor={theme.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      maxLength={20}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={{ marginBottom: Spacing.xl }}>
                  <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.sm }}>
                    确认密码
                  </ThemedText>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.backgroundTertiary,
                    borderColor: theme.border,
                    borderRadius: BorderRadius.lg,
                    borderWidth: 1,
                    paddingHorizontal: Spacing.lg,
                    height: 56,
                  }}>
                    <FontAwesome6 name="check-double" size={18} color={theme.textMuted} style={{ marginRight: Spacing.md }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, color: theme.textPrimary, height: '100%' }}
                      placeholder="请再次输入密码"
                      placeholderTextColor={theme.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      maxLength={20}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleButtonPress}
                    />
                  </View>
                </View>
              </>
            ) : (
              <View style={{ marginBottom: Spacing.xl }}>
                <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.sm }}>
                  输入密码
                </ThemedText>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.backgroundTertiary,
                  borderColor: theme.border,
                  borderRadius: BorderRadius.lg,
                  borderWidth: 1,
                  paddingHorizontal: Spacing.lg,
                  height: 56,
                }}>
                  <FontAwesome6 name="lock" size={18} color={theme.textMuted} style={{ marginRight: Spacing.md }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 16, color: theme.textPrimary, height: '100%' }}
                    placeholder="请输入访问密码"
                    placeholderTextColor={theme.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    maxLength={20}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleButtonPress}
                  />
                </View>
              </View>
            )}

            {/* 错误提示 */}
            {error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm }}>
                <FontAwesome6 name="circle-exclamation" size={14} color={theme.error} />
                <ThemedText variant="body" color={theme.error} style={{ marginLeft: Spacing.xs }}>
                  {error}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* 按钮区域 */}
          <View style={{ marginTop: Spacing['2xl'] }}>
            <TouchableOpacity
              style={{
                height: 56,
                borderRadius: BorderRadius.lg,
                backgroundColor: theme.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleButtonPress}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
                {isLoading ? '处理中...' : (mode === 'set' ? '确认设置' : '进入应用')}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* 提示区域 */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: Spacing['3xl'],
          }}>
            <FontAwesome6 name="shield-halved" size={14} color={theme.textMuted} />
            <ThemedText variant="caption" color={theme.textMuted} style={{ marginLeft: Spacing.sm }}>
              密码用于保护您的数据安全，请妥善保管
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
