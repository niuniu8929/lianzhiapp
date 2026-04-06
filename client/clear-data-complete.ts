/**
 * 完整的数据清空测试脚本
 * 在浏览器控制台或 React Native 调试器中运行此代码
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECTS_KEY = '@project_accounting_projects';
const TRANSACTIONS_KEY = '@project_accounting_transactions';
const EXPENSE_CATEGORIES_KEY = '@project_accounting_expense_categories';

async function clearAllDataWithVerification() {
  console.log('========================================');
  console.log('开始清空所有应用数据...');
  console.log('========================================\n');

  try {
    // 1. 显示当前数据状态
    console.log('📊 当前数据状态：');
    const projects = await AsyncStorage.getItem(PROJECTS_KEY);
    const transactions = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    const categories = await AsyncStorage.getItem(EXPENSE_CATEGORIES_KEY);

    console.log(`  - 项目数量: ${projects ? JSON.parse(projects).length : 0}`);
    console.log(`  - 交易记录数量: ${transactions ? JSON.parse(transactions).length : 0}`);
    console.log(`  - 支出分类数量: ${categories ? JSON.parse(categories).length : 0}`);

    // 2. 清空数据
    console.log('\n🗑️  开始清空数据...');
    await AsyncStorage.removeItem(PROJECTS_KEY);
    console.log('  ✅ 项目数据已清空');

    await AsyncStorage.removeItem(TRANSACTIONS_KEY);
    console.log('  ✅ 交易记录已清空');

    await AsyncStorage.removeItem(EXPENSE_CATEGORIES_KEY);
    console.log('  ✅ 支出分类已清空');

    // 3. 验证清空结果
    console.log('\n🔍 验证清空结果：');
    const verifyProjects = await AsyncStorage.getItem(PROJECTS_KEY);
    const verifyTransactions = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    const verifyCategories = await AsyncStorage.getItem(EXPENSE_CATEGORIES_KEY);

    const projectsCleared = !verifyProjects || JSON.parse(verifyProjects).length === 0;
    const transactionsCleared = !verifyTransactions || JSON.parse(verifyTransactions).length === 0;
    const categoriesCleared = !verifyCategories || JSON.parse(verifyCategories).length === 0;

    console.log(`  - 项目数据: ${projectsCleared ? '✅ 已清空' : '❌ 清空失败'}`);
    console.log(`  - 交易记录: ${transactionsCleared ? '✅ 已清空' : '❌ 清空失败'}`);
    console.log(`  - 支出分类: ${categoriesCleared ? '✅ 已清空' : '❌ 清空失败'}`);

    if (projectsCleared && transactionsCleared && categoriesCleared) {
      console.log('\n========================================');
      console.log('🎉 所有数据已成功清空！');
      console.log('========================================');
      console.log('\n💡 提示：请刷新应用页面以查看更新后的数据');
    } else {
      console.log('\n❌ 清空操作未完全成功，请重试');
    }

  } catch (error) {
    console.error('\n❌ 清空数据失败:', error);
  }
}

// 运行清空函数
clearAllDataWithVerification();

export { clearAllDataWithVerification };
