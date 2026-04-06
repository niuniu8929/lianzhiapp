import React from 'react';
import {
  Platform,
  StyleSheet,
  ScrollView,
  View,
  KeyboardAvoidingView,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

/**
 * # Screen 组件（简化版）
 * 
 * 最简化的 Screen 组件，只保留核心功能：
 * - 安全区处理
 * - 状态栏配置
 * - 键盘避让
 */
interface ScreenProps {
  children: React.ReactNode;
  /** 背景色，默认 #fff */
  backgroundColor?: string;
  /**
   * 状态栏样式
   * - 'dark': 黑色文字 (默认)
   * - 'light': 白色文字 (深色背景时用)
   */
  statusBarStyle?: 'auto' | 'inverted' | 'light' | 'dark';
  /**
   * 状态栏背景色
   * - 默认 'transparent' 以支持沉浸式
   * - Android 下如果需要不透明，可传入具体颜色
   */
  statusBarColor?: string;
  /**
   * 安全区控制 (关键属性)
   * - 默认: ['top', 'left', 'right', 'bottom'] (全避让)
   * - 沉浸式 Header: 去掉 'top'
   * - 自定义底部: 去掉 'bottom'
   */
  safeAreaEdges?: Edge[];
  /** 自定义容器样式 */
  style?: ViewStyle;
}

export const Screen = ({
  children,
  backgroundColor = '#fff',
  statusBarStyle = 'dark',
  statusBarColor = 'transparent',
  safeAreaEdges = ['top', 'left', 'right', 'bottom'],
  style,
}: ScreenProps) => {
  const insets = useSafeAreaInsets();

  // 解析安全区设置
  const hasTop = safeAreaEdges.includes('top');
  const hasBottom = safeAreaEdges.includes('bottom');
  const hasLeft = safeAreaEdges.includes('left');
  const hasRight = safeAreaEdges.includes('right');

  const wrapperStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: hasTop ? insets.top : 0,
    paddingLeft: hasLeft ? insets.left : 0,
    paddingRight: hasRight ? insets.right : 0,
    paddingBottom: hasBottom ? insets.bottom : 0,
  };

  return (
    <View style={wrapperStyle}>
      {/* 状态栏配置 */}
      <StatusBar
        style={statusBarStyle}
        backgroundColor={statusBarColor}
        translucent
      />

      {/* 内容区域 */}
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
