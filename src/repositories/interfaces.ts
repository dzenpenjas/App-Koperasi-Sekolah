import {
  Product,
  Category,
  Unit,
  Supplier,
  ProductPriceHistory,
  ProductBatch,
  StockMovement,
  StockAdjustment,
  Purchase,
  PurchaseItem,
  PurchasePayment,
  Sale,
  SaleItem,
  CashSession,
  CashTransaction,
  User,
  Role,
  School,
  Cooperative,
  AuditLog,
  AppSettings,
} from '../domain/types';

export interface IProductRepository {
  getAll(schoolId: string): Promise<Product[]>;
  getById(id: string): Promise<Product | undefined>;
  getByCode(schoolId: string, code: string): Promise<Product | undefined>;
  save(product: Product): Promise<void>;
  softDelete(id: string): Promise<void>;
  savePriceHistory(history: ProductPriceHistory): Promise<void>;
  getPriceHistories(productId: string): Promise<ProductPriceHistory[]>;
}

export interface ICategoryRepository {
  getAll(schoolId: string): Promise<Category[]>;
  getById(id: string): Promise<Category | undefined>;
  save(category: Category): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export interface IUnitRepository {
  getAll(schoolId: string): Promise<Unit[]>;
  getById(id: string): Promise<Unit | undefined>;
  save(unit: Unit): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export interface ISupplierRepository {
  getAll(schoolId: string): Promise<Supplier[]>;
  getById(id: string): Promise<Supplier | undefined>;
  save(supplier: Supplier): Promise<void>;
  softDelete(id: string): Promise<void>;
  updateDebt(id: string, debtDelta: number): Promise<void>;
}

export interface IStockRepository {
  getBatchesByProduct(productId: string): Promise<ProductBatch[]>;
  getAllBatches(schoolId: string): Promise<ProductBatch[]>;
  saveBatch(batch: ProductBatch): Promise<void>;
  saveMovement(movement: StockMovement): Promise<void>;
  getMovements(schoolId: string, productId?: string): Promise<StockMovement[]>;
  getAllMovements(schoolId: string): Promise<StockMovement[]>;
  saveAdjustment(adjustment: StockAdjustment): Promise<void>;
  getAdjustments(schoolId: string): Promise<StockAdjustment[]>;
}

export interface IPurchaseRepository {
  getAll(schoolId: string): Promise<Purchase[]>;
  getById(id: string): Promise<Purchase | undefined>;
  getItems(purchaseId: string): Promise<PurchaseItem[]>;
  save(purchase: Purchase, items: PurchaseItem[]): Promise<void>;
  savePayment(payment: PurchasePayment): Promise<void>;
  getPayments(purchaseId: string): Promise<PurchasePayment[]>;
}

export interface ISaleRepository {
  getAll(schoolId: string): Promise<Sale[]>;
  getById(id: string): Promise<Sale | undefined>;
  getItems(saleId: string): Promise<SaleItem[]>;
  save(sale: Sale, items: SaleItem[]): Promise<void>;
  updateStatus(saleId: string, status: Sale['status'], voidReason?: string, voidBy?: string): Promise<void>;
}

export interface ICashRepository {
  getActiveSession(schoolId: string): Promise<CashSession | undefined>;
  getAllSessions(schoolId: string): Promise<CashSession[]>;
  getSessionById(id: string): Promise<CashSession | undefined>;
  saveSession(session: CashSession): Promise<void>;
  saveTransaction(tx: CashTransaction): Promise<void>;
  getTransactionsBySession(sessionId: string): Promise<CashTransaction[]>;
}

export interface IUserRepository {
  getAll(schoolId: string): Promise<User[]>;
  getById(id: string): Promise<User | undefined>;
  getByUsername(username: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
  getRoles(): Promise<Role[]>;
  saveRole(role: Role): Promise<void>;
}

export interface IAuditRepository {
  log(audit: AuditLog): Promise<void>;
  getAll(schoolId: string): Promise<AuditLog[]>;
}

export interface ISettingsRepository {
  getSettings(schoolId: string): Promise<AppSettings | undefined>;
  saveSettings(settings: AppSettings): Promise<void>;
  getSchool(schoolId: string): Promise<School | undefined>;
  saveSchool(school: School): Promise<void>;
  getCooperative(schoolId: string): Promise<Cooperative | undefined>;
  saveCooperative(cooperative: Cooperative): Promise<void>;
}
