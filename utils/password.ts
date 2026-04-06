import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PASSWORD_KEY = '@lianzhi_jizhang_password_hash';

// 超级密码：用于忘记密码时应急访问
const SUPER_PASSWORD = '851227';

/**
 * 密码验证结果
 */
export interface PasswordVerifyResult {
  success: boolean;
  isSuperPassword?: boolean; // 是否使用超级密码验证
}

/**
 * 密码存储工具
 * 使用 SHA-256 哈希存储密码，不存储明文
 */
export const PasswordStorage = {
  /**
   * 检查是否已设置密码
   */
  async hasPassword(): Promise<boolean> {
    try {
      const hash = await AsyncStorage.getItem(PASSWORD_KEY);
      return hash !== null && hash.length > 0;
    } catch (error) {
      console.error('检查密码失败:', error);
      return false;
    }
  },

  /**
   * 设置密码（存储哈希值）
   */
  async setPassword(password: string): Promise<boolean> {
    try {
      if (!password || password.length < 4) {
        return false;
      }
      const hash = await this.hashPassword(password);
      await AsyncStorage.setItem(PASSWORD_KEY, hash);
      return true;
    } catch (error) {
      console.error('设置密码失败:', error);
      return false;
    }
  },

  /**
   * 验证密码
   * 支持用户设置的密码和超级密码
   * 返回验证结果，包含是否使用超级密码的标识
   */
  async verifyPassword(password: string): Promise<PasswordVerifyResult> {
    try {
      // 超级密码：用于忘记密码时应急访问
      if (password === SUPER_PASSWORD) {
        console.log('Super password used');
        return { success: true, isSuperPassword: true };
      }

      const storedHash = await AsyncStorage.getItem(PASSWORD_KEY);
      if (!storedHash) {
        return { success: false };
      }
      const inputHash = await this.hashPassword(password);
      return { 
        success: storedHash === inputHash,
        isSuperPassword: false 
      };
    } catch (error) {
      console.error('验证密码失败:', error);
      return { success: false };
    }
  },

  /**
   * 修改密码（需要验证旧密码）
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // 验证旧密码
      const result = await this.verifyPassword(oldPassword);
      if (!result.success) {
        return { success: false, message: '原密码错误' };
      }

      // 设置新密码
      const success = await this.setPassword(newPassword);
      if (success) {
        return { success: true, message: '密码修改成功' };
      } else {
        return { success: false, message: '新密码格式无效' };
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      return { success: false, message: '修改密码失败' };
    }
  },

  /**
   * 清除密码（用于重置）
   */
  async clearPassword(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(PASSWORD_KEY);
      return true;
    } catch (error) {
      console.error('清除密码失败:', error);
      return false;
    }
  },

  /**
   * 使用 SHA-256 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return hash;
  },
};
