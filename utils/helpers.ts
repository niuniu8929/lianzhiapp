import { Project, Transaction, ProjectStats, TransactionType } from '@/types';
import { TransactionStorage } from './storage';

/**
 * 生成 UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 格式化金额
 */
export function formatCurrency(amount: number | undefined | null): string {
  const value = amount ?? 0;
  return `¥${Math.round(value)}`;
}

/**
 * 格式化日期字符串，支持多种输入格式
 * 支持格式：YYYY-MM-DD、YYYY/MM/DD、YYYYMMDD
 * 输出格式：YYYY-MM-DD
 */
export function normalizeDateString(input: string): string {
  if (!input) return '';

  // 移除所有空格
  const cleaned = input.replace(/\s/g, '');

  // 如果已经是标准格式 YYYY-MM-DD，直接返回
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // 如果是 YYYY/MM/DD 格式，转换为 YYYY-MM-DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleaned)) {
    return cleaned.replace(/\//g, '-');
  }

  // 如果是 YYYYMMDD 格式，转换为 YYYY-MM-DD
  if (/^\d{8}$/.test(cleaned)) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  // 尝试使用 Date 对象解析
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 如果无法解析，返回空字符串
  return '';
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';

  // 先尝试标准化日期格式
  const normalized = normalizeDateString(dateString);

  // 如果标准化失败，返回原始字符串
  if (!normalized) return dateString;

  const date = new Date(normalized);
  if (isNaN(date.getTime())) return dateString;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const datePart = formatDate(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}`;
}

/**
 * 计算项目统计数据
 */
export async function calculateProjectStats(project: Project): Promise<ProjectStats> {
  const transactions = await TransactionStorage.getByProjectId(project.id);

  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = project.receivedAmount; // 已收款作为收入
  const netProfit = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    netProfit,
  };
}

/**
 * 计算所有项目的统计数据
 */
export async function calculateAllProjectsStats(): Promise<Map<string, number>> {
  const transactions = await TransactionStorage.getAll();

  // 按项目分组统计支出
  const projectExpenses = new Map<string, number>();
  transactions.forEach(t => {
    const current = projectExpenses.get(t.projectId) || 0;
    projectExpenses.set(t.projectId, current + t.amount);
  });

  return projectExpenses;
}

/**
 * 按费用类型统计支出
 */
export function calculateExpenseByType(transactions: Transaction[]): Map<TransactionType, number> {
  const stats = new Map<TransactionType, number>();
  
  (['material', 'equipment', 'labor'] as TransactionType[]).forEach(type => {
    stats.set(type, 0);
  });

  transactions.forEach(t => {
    const current = stats.get(t.type) || 0;
    stats.set(t.type, current + t.amount);
  });

  return stats;
}

/**
 * 按日期统计支出（最近30天）
 */
export function calculateExpenseByDate(transactions: Transaction[]): Map<string, number> {
  const stats = new Map<string, number>();
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  transactions
    .filter(t => new Date(t.date) >= thirtyDaysAgo)
    .forEach(t => {
      const dateKey = formatDate(t.date);
      const current = stats.get(dateKey) || 0;
      stats.set(dateKey, current + t.amount);
    });

  return stats;
}
