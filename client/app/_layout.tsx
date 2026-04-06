import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ColorSchemeProvider } from '@/hooks/useColorScheme';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { PasswordStorage } from '@/utils/password';
import PasswordScreen from '@/screens/password';

// 防止启动页自动隐藏
SplashScreen.preventAutoHideAsync();

// 加载中组件
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}

// 主应用组件（需要密码验证）
function MainApp({ isAuthenticated, hasPassword, onAuthSuccess }: {
  isAuthenticated: boolean;
  hasPassword: boolean | null;
  onAuthSuccess: (isSuperPassword?: boolean) => void;
}) {
  // 加载中
  if (hasPassword === null) {
    return <LoadingScreen />;
  }

  // 需要设置密码
  if (hasPassword === false) {
    return <PasswordScreen mode="set" onSuccess={onAuthSuccess} />;
  }

  // 需要验证密码
  if (hasPassword === true && !isAuthenticated) {
    return <PasswordScreen mode="verify" onSuccess={onAuthSuccess} />;
  }

  // 已验证，显示主应用
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="projects/detail" />
        <Stack.Screen name="projects/add" />
        <Stack.Screen name="projects/edit" />
        <Stack.Screen name="transactions/add" />
        <Stack.Screen name="expenses/categories" />
        <Stack.Screen name="expenses/add" />
        <Stack.Screen name="expenses/edit" />
        <Stack.Screen name="delivery-add" />
        <Stack.Screen name="delivery-edit" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 检查密码状态
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const hasPwd = await PasswordStorage.hasPassword();
        setHasPassword(hasPwd);
      } catch (e) {
        console.error('检查密码状态失败:', e);
        setHasPassword(false);
      } finally {
        setIsLoading(false);
        await SplashScreen.hideAsync();
      }
    };
    checkPassword();
  }, []);

  // 密码验证成功回调
  const handleAuthSuccess = useCallback(async (isSuperPassword?: boolean) => {
    console.log('handleAuthSuccess called, isSuperPassword:', isSuperPassword);
    
    // 如果是超级密码登录，清除原密码，让用户重新设置
    if (isSuperPassword) {
      console.log('超级密码登录，清除原密码，重新设置');
      await PasswordStorage.clearPassword();
      setHasPassword(false);
      setIsAuthenticated(false);
      return;
    }

    // 正常登录，设置密码成功后，同时更新 hasPassword 和 isAuthenticated
    setHasPassword(true);
    setIsAuthenticated(true);
  }, []);

  // 初始加载状态
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ColorSchemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MainApp
          isAuthenticated={isAuthenticated}
          hasPassword={hasPassword}
          onAuthSuccess={handleAuthSuccess}
        />
      </GestureHandlerRootView>
    </ColorSchemeProvider>
  );
}
