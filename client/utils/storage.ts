import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Transaction, ExportData, ExpenseCategory, PaymentRecord, InvoiceRecord, DeliveryRecord, DeliveryPaymentRecord, DeliveryInvoiceRecord } from '@/types';

const PROJECTS_KEY = '@project_accounting_projects';
const TRANSACTIONS_KEY = '@project_accounting_transactions';
const EXPENSE_CATEGORIES_KEY = '@project_accounting_expense_categories';
const PAYMENT_RECORDS_KEY = '@project_accounting_payment_records';
const INVOICE_RECORDS_KEY = '@project_accounting_invoice_records';
const DELIVERY_RECORDS_KEY = '@project_accounting_delivery_records';
const DELIVERY_PAYMENT_RECORDS_KEY = '@project_accounting_delivery_payment_records';
const DELIVERY_INVOICE_RECORDS_KEY = '@project_accounting_delivery_invoice_records';

/**
 * 项目数据存储工具
 */
export const ProjectStorage = {
  /**
   * 获取所有项目
   */
  async getAll(): Promise<Project[]> {
    try {
      const data = await AsyncStorage.getItem(PROJECTS_KEY);
      if (!data) return [];

      const projects: Project[] = JSON.parse(data);

      // 检查是否需要迁移
      const needsMigration = projects.some((p: any) =>
        p.budget !== undefined ||
        p.progress !== undefined ||
        p.tags !== undefined ||
        p.color !== undefined ||
        p.settlementAmount === undefined
      );

      if (needsMigration) {
        const migratedProjects = projects.map((p: any) => ({
          ...p,
          description: p.description ?? undefined,
          priority: p.priority ?? 'medium',
          manager: p.manager ?? undefined,
          startDate: p.startDate ?? undefined,
          endDate: p.endDate ?? undefined,
          settlementAmount: p.budget ?? p.settlementAmount ?? undefined,
          contractAmount: p.contractAmount ?? undefined,
          receivedAmount: p.receivedAmount ?? 0,
          invoiceStatus: p.invoiceStatus ?? 'none',
          invoiceAmount: p.invoiceAmount ?? 0,
          // 移除已废弃的字段
          budget: undefined,
          progress: undefined,
          tags: undefined,
          color: undefined,
        })) as Project[];
        await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(migratedProjects));
        return migratedProjects;
      }

      return projects;
    } catch (error) {
      console.error('获取项目列表失败:', error);
      return [];
    }
  },

  /**
   * 根据 ID 获取项目
   */
  async getById(id: string): Promise<Project | null> {
    try {
      const projects = await this.getAll();
      return projects.find(p => p.id === id) || null;
    } catch (error) {
      console.error('获取项目失败:', error);
      return null;
    }
  },

  /**
   * 保存项目（新增或更新）
   */
  async save(project: Project): Promise<boolean> {
    try {
      const projects = await this.getAll();
      const index = projects.findIndex(p => p.id === project.id);

      if (index >= 0) {
        // 更新现有项目
        projects[index] = {
          ...project,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // 新增项目
        projects.push(project);
      }

      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      return true;
    } catch (error) {
      console.error('保存项目失败:', error);
      return false;
    }
  },

  /**
   * 删除项目
   */
  async delete(id: string): Promise<boolean> {
    try {
      let projects = await this.getAll();
      projects = projects.filter(p => p.id !== id);
      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      return true;
    } catch (error) {
      console.error('删除项目失败:', error);
      return false;
    }
  },

  /**
   * 清空所有项目
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(PROJECTS_KEY);
      return true;
    } catch (error) {
      console.error('清空项目失败:', error);
      return false;
    }
  },
};

/**
 * 记账数据存储工具
 */
export const TransactionStorage = {
  /**
   * 获取所有交易记录
   */
  async getAll(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(TRANSACTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取交易记录失败:', error);
      return [];
    }
  },

  /**
   * 根据 ID 获取交易记录
   */
  async getById(id: string): Promise<Transaction | null> {
    try {
      const transactions = await this.getAll();
      return transactions.find(t => t.id === id) || null;
    } catch (error) {
      console.error('获取交易记录失败:', error);
      return null;
    }
  },

  /**
   * 根据项目 ID 获取交易记录
   */
  async getByProjectId(projectId: string): Promise<Transaction[]> {
    try {
      const transactions = await this.getAll();
      return transactions.filter(t => t.projectId === projectId);
    } catch (error) {
      console.error('获取项目交易记录失败:', error);
      return [];
    }
  },

  /**
   * 保存交易记录（新增）
   */
  async save(transaction: Transaction): Promise<boolean> {
    try {
      const transactions = await this.getAll();
      transactions.push(transaction);
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      return true;
    } catch (error) {
      console.error('保存交易记录失败:', error);
      return false;
    }
  },

  /**
   * 更新交易记录
   */
  async update(transaction: Transaction): Promise<boolean> {
    try {
      const transactions = await this.getAll();
      const index = transactions.findIndex(t => t.id === transaction.id);

      if (index >= 0) {
        transactions[index] = transaction;
        await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新交易记录失败:', error);
      return false;
    }
  },

  /**
   * 删除交易记录
   */
  async delete(id: string): Promise<boolean> {
    try {
      let transactions = await this.getAll();
      transactions = transactions.filter(t => t.id !== id);
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      return true;
    } catch (error) {
      console.error('删除交易记录失败:', error);
      return false;
    }
  },

  /**
   * 删除项目的所有交易记录
   */
  async deleteByProjectId(projectId: string): Promise<boolean> {
    try {
      let transactions = await this.getAll();
      transactions = transactions.filter(t => t.projectId !== projectId);
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      return true;
    } catch (error) {
      console.error('删除项目交易记录失败:', error);
      return false;
    }
  },

  /**
   * 清空所有交易记录
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(TRANSACTIONS_KEY);
      return true;
    } catch (error) {
      console.error('清空交易记录失败:', error);
      return false;
    }
  },
};

/**
 * 支出分类数据存储工具
 */
export const ExpenseCategoryStorage = {
  /**
   * 获取所有支出分类
   */
  async getAll(): Promise<ExpenseCategory[]> {
    try {
      const data = await AsyncStorage.getItem(EXPENSE_CATEGORIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取支出分类失败:', error);
      return [];
    }
  },

  /**
   * 根据 ID 获取支出分类
   */
  async getById(id: string): Promise<ExpenseCategory | null> {
    try {
      const categories = await this.getAll();
      return categories.find(c => c.id === id) || null;
    } catch (error) {
      console.error('获取支出分类失败:', error);
      return null;
    }
  },

  /**
   * 保存支出分类（新增或更新）
   */
  async save(category: ExpenseCategory): Promise<boolean> {
    try {
      const categories = await this.getAll();
      const index = categories.findIndex(c => c.id === category.id);

      if (index >= 0) {
        // 更新现有分类
        categories[index] = {
          ...category,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // 新增分类
        categories.push(category);
      }

      await AsyncStorage.setItem(EXPENSE_CATEGORIES_KEY, JSON.stringify(categories));
      return true;
    } catch (error) {
      console.error('保存支出分类失败:', error);
      return false;
    }
  },

  /**
   * 删除支出分类
   */
  async delete(id: string): Promise<boolean> {
    try {
      let categories = await this.getAll();
      categories = categories.filter(c => c.id !== id);
      await AsyncStorage.setItem(EXPENSE_CATEGORIES_KEY, JSON.stringify(categories));
      return true;
    } catch (error) {
      console.error('删除支出分类失败:', error);
      return false;
    }
  },

  /**
   * 清空所有支出分类
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(EXPENSE_CATEGORIES_KEY);
      return true;
    } catch (error) {
      console.error('清空支出分类失败:', error);
      return false;
    }
  },
};

/**
 * 数据导出工具
 */
export const ExportUtils = {
  /**
   * 导出所有数据
   */
  async exportData(): Promise<ExportData> {
    const projects = await ProjectStorage.getAll();
    const transactions = await TransactionStorage.getAll();
    const expenseCategories = await ExpenseCategoryStorage.getAll();
    const paymentRecords = await PaymentRecordStorage.getAll();
    const invoiceRecords = await InvoiceRecordStorage.getAll();
    const deliveryRecords = await DeliveryRecordStorage.getAll();

    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      projects,
      transactions,
      expenseCategories,
      paymentRecords,
      invoiceRecords,
      deliveryRecords,
    };
  },

  /**
   * 导入数据（覆盖模式）
   */
  async importData(data: ExportData): Promise<boolean> {
    try {
      // 验证数据格式
      if (!data.projects || !data.transactions || !data.expenseCategories) {
        throw new Error('数据格式无效');
      }

      // 清空现有数据
      await ProjectStorage.clear();
      await TransactionStorage.clear();
      await ExpenseCategoryStorage.clear();
      await PaymentRecordStorage.clear();
      await InvoiceRecordStorage.clear();
      await DeliveryRecordStorage.clear();

      // 导入新数据
      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(data.projects));
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(data.transactions));
      await AsyncStorage.setItem(EXPENSE_CATEGORIES_KEY, JSON.stringify(data.expenseCategories));
      await AsyncStorage.setItem(PAYMENT_RECORDS_KEY, JSON.stringify(data.paymentRecords || []));
      await AsyncStorage.setItem(INVOICE_RECORDS_KEY, JSON.stringify(data.invoiceRecords || []));
      await AsyncStorage.setItem(DELIVERY_RECORDS_KEY, JSON.stringify(data.deliveryRecords || []));

      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  },
};

/**
 * 收款记录数据存储工具
 */
export const PaymentRecordStorage = {
  /**
   * 获取所有收款记录
   */
  async getAll(): Promise<PaymentRecord[]> {
    try {
      const data = await AsyncStorage.getItem(PAYMENT_RECORDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取收款记录失败:', error);
      return [];
    }
  },

  /**
   * 根据项目 ID 获取收款记录
   */
  async getByProjectId(projectId: string): Promise<PaymentRecord[]> {
    try {
      const records = await this.getAll();
      return records.filter(r => r.projectId === projectId);
    } catch (error) {
      console.error('获取项目收款记录失败:', error);
      return [];
    }
  },

  /**
   * 保存收款记录（新增）
   */
  async save(record: PaymentRecord): Promise<boolean> {
    try {
      const records = await this.getAll();
      records.push(record);
      await AsyncStorage.setItem(PAYMENT_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('保存收款记录失败:', error);
      return false;
    }
  },

  /**
   * 删除收款记录
   */
  async delete(id: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.id !== id);
      await AsyncStorage.setItem(PAYMENT_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除收款记录失败:', error);
      return false;
    }
  },

  /**
   * 删除项目的所有收款记录
   */
  async deleteByProjectId(projectId: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.projectId !== projectId);
      await AsyncStorage.setItem(PAYMENT_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除项目收款记录失败:', error);
      return false;
    }
  },

  /**
   * 清空所有收款记录
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(PAYMENT_RECORDS_KEY);
      return true;
    } catch (error) {
      console.error('清空收款记录失败:', error);
      return false;
    }
  },
};

/**
 * 开票记录数据存储工具
 */
export const InvoiceRecordStorage = {
  /**
   * 获取所有开票记录
   */
  async getAll(): Promise<InvoiceRecord[]> {
    try {
      const data = await AsyncStorage.getItem(INVOICE_RECORDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取开票记录失败:', error);
      return [];
    }
  },

  /**
   * 根据项目 ID 获取开票记录
   */
  async getByProjectId(projectId: string): Promise<InvoiceRecord[]> {
    try {
      const records = await this.getAll();
      return records.filter(r => r.projectId === projectId);
    } catch (error) {
      console.error('获取项目开票记录失败:', error);
      return [];
    }
  },

  /**
   * 保存开票记录（新增）
   */
  async save(record: InvoiceRecord): Promise<boolean> {
    try {
      const records = await this.getAll();
      records.push(record);
      await AsyncStorage.setItem(INVOICE_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('保存开票记录失败:', error);
      return false;
    }
  },

  /**
   * 删除开票记录
   */
  async delete(id: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.id !== id);
      await AsyncStorage.setItem(INVOICE_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除开票记录失败:', error);
      return false;
    }
  },

  /**
   * 删除项目的所有开票记录
   */
  async deleteByProjectId(projectId: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.projectId !== projectId);
      await AsyncStorage.setItem(INVOICE_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除项目开票记录失败:', error);
      return false;
    }
  },

  /**
   * 清空所有开票记录
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(INVOICE_RECORDS_KEY);
      return true;
    } catch (error) {
      console.error('清空开票记录失败:', error);
      return false;
    }
  },
};

/**
 * 送货记录数据存储工具
 */
export const DeliveryRecordStorage = {
  /**
   * 获取所有送货记录
   */
  async getAll(): Promise<DeliveryRecord[]> {
    try {
      const data = await AsyncStorage.getItem(DELIVERY_RECORDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取送货记录失败:', error);
      return [];
    }
  },

  /**
   * 根据 ID 获取送货记录
   */
  async getById(id: string): Promise<DeliveryRecord | null> {
    try {
      const records = await this.getAll();
      return records.find(r => r.id === id) || null;
    } catch (error) {
      console.error('获取送货记录失败:', error);
      return null;
    }
  },

  /**
   * 根据项目 ID 获取送货记录
   */
  async getByProjectId(projectId: string): Promise<DeliveryRecord[]> {
    try {
      const records = await this.getAll();
      return records.filter(r => r.projectId === projectId);
    } catch (error) {
      console.error('获取项目送货记录失败:', error);
      return [];
    }
  },

  /**
   * 保存送货记录（新增或更新）
   */
  async save(record: DeliveryRecord): Promise<boolean> {
    try {
      const records = await this.getAll();
      const index = records.findIndex(r => r.id === record.id);

      if (index >= 0) {
        // 更新现有记录
        records[index] = {
          ...record,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // 新增记录
        records.push(record);
      }

      await AsyncStorage.setItem(DELIVERY_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('保存送货记录失败:', error);
      return false;
    }
  },

  /**
   * 删除送货记录
   */
  async delete(id: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.id !== id);
      await AsyncStorage.setItem(DELIVERY_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除送货记录失败:', error);
      return false;
    }
  },

  /**
   * 删除项目的所有送货记录
   */
  async deleteByProjectId(projectId: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.projectId !== projectId);
      await AsyncStorage.setItem(DELIVERY_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除项目送货记录失败:', error);
      return false;
    }
  },

  /**
   * 清空所有送货记录
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(DELIVERY_RECORDS_KEY);
      return true;
    } catch (error) {
      console.error('清空送货记录失败:', error);
      return false;
    }
  },
};


/**
 * 零星采购收款记录数据存储工具
 */
export const DeliveryPaymentRecordStorage = {
  async getAll(): Promise<DeliveryPaymentRecord[]> {
    try {
      const data = await AsyncStorage.getItem(DELIVERY_PAYMENT_RECORDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取零星采购收款记录失败:', error);
      return [];
    }
  },

  async getByProjectId(projectId: string): Promise<DeliveryPaymentRecord[]> {
    try {
      const records = await this.getAll();
      return records.filter(r => r.projectId === projectId);
    } catch (error) {
      console.error('获取项目零星采购收款记录失败:', error);
      return [];
    }
  },

  async save(record: DeliveryPaymentRecord): Promise<boolean> {
    try {
      const records = await this.getAll();
      const index = records.findIndex(r => r.id === record.id);
      if (index >= 0) {
        records[index] = record;
      } else {
        records.push(record);
      }
      await AsyncStorage.setItem(DELIVERY_PAYMENT_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('保存零星采购收款记录失败:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.id !== id);
      await AsyncStorage.setItem(DELIVERY_PAYMENT_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除零星采购收款记录失败:', error);
      return false;
    }
  },

  async deleteByProjectId(projectId: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.projectId !== projectId);
      await AsyncStorage.setItem(DELIVERY_PAYMENT_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除项目零星采购收款记录失败:', error);
      return false;
    }
  },

  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(DELIVERY_PAYMENT_RECORDS_KEY);
      return true;
    } catch (error) {
      console.error('清空零星采购收款记录失败:', error);
      return false;
    }
  },
};

/**
 * 零星采购开票记录数据存储工具
 */
export const DeliveryInvoiceRecordStorage = {
  async getAll(): Promise<DeliveryInvoiceRecord[]> {
    try {
      const data = await AsyncStorage.getItem(DELIVERY_INVOICE_RECORDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取零星采购开票记录失败:', error);
      return [];
    }
  },

  async getByProjectId(projectId: string): Promise<DeliveryInvoiceRecord[]> {
    try {
      const records = await this.getAll();
      return records.filter(r => r.projectId === projectId);
    } catch (error) {
      console.error('获取项目零星采购开票记录失败:', error);
      return [];
    }
  },

  async save(record: DeliveryInvoiceRecord): Promise<boolean> {
    try {
      const records = await this.getAll();
      const index = records.findIndex(r => r.id === record.id);
      if (index >= 0) {
        records[index] = record;
      } else {
        records.push(record);
      }
      await AsyncStorage.setItem(DELIVERY_INVOICE_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('保存零星采购开票记录失败:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.id !== id);
      await AsyncStorage.setItem(DELIVERY_INVOICE_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除零星采购开票记录失败:', error);
      return false;
    }
  },

  async deleteByProjectId(projectId: string): Promise<boolean> {
    try {
      let records = await this.getAll();
      records = records.filter(r => r.projectId !== projectId);
      await AsyncStorage.setItem(DELIVERY_INVOICE_RECORDS_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('删除项目零星采购开票记录失败:', error);
      return false;
    }
  },

  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(DELIVERY_INVOICE_RECORDS_KEY);
      return true;
    } catch (error) {
      console.error('清空零星采购开票记录失败:', error);
      return false;
    }
  },
};
