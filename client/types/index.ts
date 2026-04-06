/**
 * 项目类型枚举
 */
export type ProjectType = 'contract' | 'delivery';

/**
 * 项目状态枚举
 */
export type ProjectStatus = 'active' | 'completed' | 'paused';

/**
 * 开票状态枚举
 */
export type InvoiceStatus = 'none' | 'partial' | 'completed';

/**
 * 项目类型名称映射
 */
export const ProjectTypeNames: Record<ProjectType, string> = {
  contract: '工程项目',
  delivery: '零星采购',
};

/**
 * 费用类型枚举
 */
export type TransactionType = 'material' | 'equipment' | 'labor';

/**
 * 费用类型名称映射
 */
export const TransactionTypeNames: Record<TransactionType, string> = {
  material: '材料费',
  equipment: '设备费',
  labor: '人工费',
};

/**
 * 项目状态名称映射
 */
export const ProjectStatusNames: Record<ProjectStatus, string> = {
  active: '进行中',
  completed: '已完成',
  paused: '已暂停',
};

/**
 * 开票状态名称映射
 */
export const InvoiceStatusNames: Record<InvoiceStatus, string> = {
  none: '未开票',
  partial: '部分开票',
  completed: '已开票',
};

/**
 * 支出分类数据模型
 */
export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 项目数据模型
 */
export interface Project {
  id: string;
  name: string;
  projectType: ProjectType; // 项目类型：工程项目/零星采购
  description?: string; // 项目备注/描述
  manager?: string; // 项目负责人
  startDate?: string; // 开始日期
  endDate?: string; // 预计完成日期
  contractAmount?: number; // 合同金额（工程项目用）
  deliveryAmount?: number; // 送货总金额（零星采购用）
  receivedAmount: number; // 已收款金额
  settlementAmount?: number; // 结算金额
  invoiceStatus: InvoiceStatus; // 开票状态：未开票/部分开票/已开票
  invoiceAmount: number; // 已开票金额
  status: ProjectStatus;
  // 合同图片（工程项目用）
  contractImages?: string[]; // 合同图片URL列表
  createdAt: string;
  updatedAt: string;
}

/**
 * 记账记录数据模型
 */
export interface Transaction {
  id: string;
  projectId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId?: string; // 支出分类ID（可选）
  purchaseUnit?: string; // 采购单位
  isInvoiced?: boolean; // 是否开票
  isPaid?: boolean; // 是否付款
  images?: string[]; // 图片URL列表
  createdAt: string;
  updatedAt?: string;
}

/**
 * 收款记录数据模型
 */
export interface PaymentRecord {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  description?: string;
  date: string; // 收款日期
  createdAt: string;
}

/**
 * 开票记录数据模型
 */
export interface InvoiceRecord {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  description?: string;
  date: string; // 开票日期
  createdAt: string;
}

/**
 * 送货记录数据模型（零星采购专用）
 */
export interface DeliveryRecord {
  id: string;
  projectId: string;
  projectName: string;
  description: string; // 送货描述
  images: string[]; // 图片URL列表
  date: string; // 送货日期
  amount: number; // 送货金额
  invoiceStatus: InvoiceStatus; // 开票状态
  invoiceAmount: number; // 已开票金额
  receivedAmount: number; // 已收款金额
  createdAt: string;
  updatedAt: string;
}

/**
 * 项目统计数据
 */
export interface ProjectStats {
  totalIncome: number; // 已收款金额
  totalExpense: number; // 总支出
  netProfit: number; // 净收益（收入 - 支出）
}

/**
 * 零星采购收款记录数据模型
 */
export interface DeliveryPaymentRecord {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  description?: string;
  date: string; // 收款日期
  createdAt: string;
}

/**
 * 零星采购开票记录数据模型
 */
export interface DeliveryInvoiceRecord {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  description?: string;
  date: string; // 开票日期
  createdAt: string;
}

/**
 * 导出数据格式
 */
export interface ExportData {
  version: string;
  exportDate: string;
  projects: Project[];
  transactions: Transaction[];
  expenseCategories: ExpenseCategory[];
  paymentRecords?: PaymentRecord[];
  invoiceRecords?: InvoiceRecord[];
  deliveryRecords?: DeliveryRecord[];
  deliveryPaymentRecords?: DeliveryPaymentRecord[];
  deliveryInvoiceRecords?: DeliveryInvoiceRecord[];
}
