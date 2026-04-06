import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 清空应用所有数据
 * 运行此脚本将删除所有项目、交易记录和支出分类
 */

const PROJECTS_KEY = '@project_accounting_projects';
const TRANSACTIONS_KEY = '@project_accounting_transactions';
const EXPENSE_CATEGORIES_KEY = '@project_accounting_expense_categories';

async function clearAllData() {
  console.log('开始清空应用数据...');

  try {
    // 清空项目数据
    await AsyncStorage.removeItem(PROJECTS_KEY);
    console.log('✅ 项目数据已清空');

    // 清空交易记录
    await AsyncStorage.removeItem(TRANSACTIONS_KEY);
    console.log('✅ 交易记录已清空');

    // 清空支出分类
    await AsyncStorage.removeItem(EXPENSE_CATEGORIES_KEY);
    console.log('✅ 支出分类已清空');

    console.log('\n🎉 所有数据已成功清空！');
  } catch (error) {
    console.error('❌ 清空数据失败:', error);
  }
}

clearAllData();
