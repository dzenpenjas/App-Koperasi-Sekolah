/**
 * Domain Models and Types for Aplikasi Koperasi Sekolah
 * Following Business Rules and Entity Catalog
 */

export type RoleName = 'Administrator' | 'Ketua' | 'Bendahara' | 'Pengurus' | 'Kasir' | 'Viewer';

export interface School {
  id: string;
  school_name: string;
  npsn?: string;
  principal_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at?: string;
}

export interface Cooperative {
  id: string;
  school_id: string;
  cooperative_name: string;
  established_date?: string;
  description?: string;
}

export interface Role {
  id: string;
  role_name: RoleName;
  description: string;
  created_at: string;
}

export interface User {
  id: string;
  school_id: string;
  full_name: string;
  username: string;
  password_hash: string;
  role_id: string;
  role_name: RoleName;
  phone?: string;
  email?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Category {
  id: string;
  school_id: string;
  name: string;
  code: string;
  sort_order: number;
  status: 'Active' | 'Inactive';
  created_at: string;
  deleted_at?: string;
}

export interface Unit {
  id: string;
  school_id: string;
  name: string;
  code: string;
  created_at: string;
  deleted_at?: string;
}

export interface Supplier {
  id: string;
  school_id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  total_debt: number; // in integer IDR
  current_debt?: number;
  status: 'Active' | 'Inactive';
  created_at: string;
  deleted_at?: string;
}

export interface Product {
  id: string;
  school_id: string;
  code: string;
  name: string;
  category_id: string;
  unit_id: string;
  cost_price?: number;
  selling_price: number; // in integer IDR
  min_stock: number;
  has_expiry?: boolean;
  barcode?: string;
  image_url?: string;
  description?: string;
  status: 'Active' | 'Inactive';
  total_stock: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ProductPriceHistory {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  changed_by: string;
  reason?: string;
  created_at: string;
}

export interface ProductBatch {
  id: string;
  school_id: string;
  product_id: string;
  batch_number: string;
  purchase_id?: string;
  purchase_price: number; // in integer IDR
  initial_qty: number;
  remaining_qty: number;
  supplier_id?: string;
  expiry_date?: string; // ISO string YYYY-MM-DD
  status: 'Aktif' | 'Habis' | 'Kedaluwarsa';
  created_at: string;
}

export type StockMovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'DAMAGE' | 'EXPIRED' | 'VOID';

export interface StockMovement {
  id: string;
  school_id: string;
  product_id: string;
  batch_id: string;
  movement_type: StockMovementType;
  qty: number; // positive = stock in, negative = stock out
  reference_id?: string; // sale_id or purchase_id or adjustment_id
  notes?: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  school_id: string;
  product_id: string;
  batch_id: string;
  old_qty: number;
  new_qty: number;
  difference: number;
  reason: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export type PurchaseStatus = 'Draft' | 'Final';
export type PurchasePaymentStatus = 'Belum Dibayar' | 'Sebagian' | 'Lunas';

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  qty: number;
  purchase_price: number;
  subtotal: number;
  expiry_date?: string;
}

export interface Purchase {
  id: string;
  school_id: string;
  purchase_number: string;
  purchase_date: string;
  supplier_id: string;
  supplier_name: string;
  user_id: string;
  user_name: string;
  status: PurchaseStatus;
  payment_status: PurchasePaymentStatus;
  total_amount: number;
  discount_amount: number;
  additional_fee: number;
  grand_total: number;
  paid_amount: number;
  notes?: string;
  items?: PurchaseItem[];
  created_at: string;
}

export interface PurchasePayment {
  id: string;
  purchase_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  notes?: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export type SaleStatus = 'Draft' | 'Dibayar' | 'Dibatalkan';

export interface BatchAllocation {
  batch_id: string;
  batch_number: string;
  qty: number;
  purchase_price: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  unit_name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  cogs_amount: number; // Cost of goods sold for this item
  batch_allocations: BatchAllocation[];
}

export interface Sale {
  id: string;
  school_id: string;
  sale_number: string;
  sale_date: string;
  user_id: string;
  user_name: string;
  status: SaleStatus;
  total_amount: number;
  discount_amount: number;
  grand_total: number;
  cogs_total: number;
  profit_total: number;
  payment_method: 'Tunai';
  paid_amount: number;
  change_amount: number;
  notes?: string;
  items: SaleItem[];
  void_reason?: string;
  void_at?: string;
  void_by?: string;
  created_at: string;
}

export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type CashTransactionType = 'SALE' | 'IN' | 'OUT' | 'ADJUSTMENT';

export interface CashSession {
  id: string;
  school_id: string;
  user_id: string;
  user_name: string;
  open_time: string;
  close_time?: string;
  initial_cash: number;
  total_sales_cash: number;
  total_in_cash: number;
  total_out_cash: number;
  expected_closing_cash: number;
  actual_closing_cash?: number;
  discrepancy?: number;
  discrepancy_notes?: string;
  status: CashSessionStatus;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  school_id: string;
  cash_session_id: string;
  transaction_type: CashTransactionType;
  amount: number;
  category: string; // 'Penjualan', 'Operasional', 'Konsumsi', 'Transportasi', dll.
  description: string;
  reference_id?: string; // sale_id or manual receipt
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  school_id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
}

export interface AppSettings {
  id: string;
  school_id: string;
  hpp_method: 'FIFO' | 'AVERAGE';
  default_min_stock: number;
  currency: string;
  receipt_header: string;
  receipt_footer: string;
  auto_print: boolean;
  enable_expiry_warning: boolean;
  enable_batches: boolean;
  updated_at: string;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageMaster: boolean;
  canPurchase: boolean;
  canSell: boolean;
  canManageCash: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canBackupRestore: boolean;
  canAdjustStock: boolean;
  canVoid: boolean;
}
