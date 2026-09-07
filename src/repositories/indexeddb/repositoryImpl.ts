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
} from '../../domain/types';
import {
  STORES,
  getAllFromStore,
  getFromStore,
  putToStore,
  putMultipleToStore,
  runAtomicTransaction,
} from './db';
import {
  IProductRepository,
  ICategoryRepository,
  IUnitRepository,
  ISupplierRepository,
  IStockRepository,
  IPurchaseRepository,
  ISaleRepository,
  ICashRepository,
  IUserRepository,
  IAuditRepository,
  ISettingsRepository,
} from '../interfaces';

export class IndexedProductRepository implements IProductRepository {
  async getAll(schoolId: string): Promise<Product[]> {
    const all = await getAllFromStore<Product>(STORES.PRODUCTS);
    return all.filter((p) => p.school_id === schoolId && !p.deleted_at);
  }

  async getById(id: string): Promise<Product | undefined> {
    return getFromStore<Product>(STORES.PRODUCTS, id);
  }

  async getByCode(schoolId: string, code: string): Promise<Product | undefined> {
    const all = await this.getAll(schoolId);
    return all.find((p) => p.code.toLowerCase() === code.trim().toLowerCase());
  }

  async save(product: Product): Promise<void> {
    await putToStore(STORES.PRODUCTS, product);
  }

  async softDelete(id: string): Promise<void> {
    const product = await this.getById(id);
    if (product) {
      product.deleted_at = new Date().toISOString();
      product.status = 'Inactive';
      await putToStore(STORES.PRODUCTS, product);
    }
  }

  async savePriceHistory(history: ProductPriceHistory): Promise<void> {
    await putToStore(STORES.PRICE_HISTORIES, history);
  }

  async getPriceHistories(productId: string): Promise<ProductPriceHistory[]> {
    const all = await getAllFromStore<ProductPriceHistory>(STORES.PRICE_HISTORIES);
    return all
      .filter((h) => h.product_id === productId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export class IndexedCategoryRepository implements ICategoryRepository {
  async getAll(schoolId: string): Promise<Category[]> {
    const all = await getAllFromStore<Category>(STORES.CATEGORIES);
    return all
      .filter((c) => c.school_id === schoolId && !c.deleted_at)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async getById(id: string): Promise<Category | undefined> {
    return getFromStore<Category>(STORES.CATEGORIES, id);
  }

  async save(category: Category): Promise<void> {
    await putToStore(STORES.CATEGORIES, category);
  }

  async softDelete(id: string): Promise<void> {
    const cat = await this.getById(id);
    if (cat) {
      cat.deleted_at = new Date().toISOString();
      cat.status = 'Inactive';
      await putToStore(STORES.CATEGORIES, cat);
    }
  }
}

export class IndexedUnitRepository implements IUnitRepository {
  async getAll(schoolId: string): Promise<Unit[]> {
    const all = await getAllFromStore<Unit>(STORES.UNITS);
    return all.filter((u) => u.school_id === schoolId && !u.deleted_at);
  }

  async getById(id: string): Promise<Unit | undefined> {
    return getFromStore<Unit>(STORES.UNITS, id);
  }

  async save(unit: Unit): Promise<void> {
    await putToStore(STORES.UNITS, unit);
  }

  async softDelete(id: string): Promise<void> {
    const unit = await this.getById(id);
    if (unit) {
      unit.deleted_at = new Date().toISOString();
      await putToStore(STORES.UNITS, unit);
    }
  }
}

export class IndexedSupplierRepository implements ISupplierRepository {
  async getAll(schoolId: string): Promise<Supplier[]> {
    const all = await getAllFromStore<Supplier>(STORES.SUPPLIERS);
    return all.filter((s) => s.school_id === schoolId && !s.deleted_at);
  }

  async getById(id: string): Promise<Supplier | undefined> {
    return getFromStore<Supplier>(STORES.SUPPLIERS, id);
  }

  async save(supplier: Supplier): Promise<void> {
    await putToStore(STORES.SUPPLIERS, supplier);
  }

  async softDelete(id: string): Promise<void> {
    const supplier = await this.getById(id);
    if (supplier) {
      supplier.deleted_at = new Date().toISOString();
      supplier.status = 'Inactive';
      await putToStore(STORES.SUPPLIERS, supplier);
    }
  }

  async updateDebt(id: string, debtDelta: number): Promise<void> {
    const supplier = await this.getById(id);
    if (supplier) {
      supplier.total_debt = Math.max(0, (supplier.total_debt || 0) + debtDelta);
      await putToStore(STORES.SUPPLIERS, supplier);
    }
  }
}

export class IndexedStockRepository implements IStockRepository {
  async getBatchesByProduct(productId: string): Promise<ProductBatch[]> {
    const all = await getAllFromStore<ProductBatch>(STORES.PRODUCT_BATCHES);
    return all
      .filter((b) => b.product_id === productId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async getAllBatches(schoolId: string): Promise<ProductBatch[]> {
    const all = await getAllFromStore<ProductBatch>(STORES.PRODUCT_BATCHES);
    return all.filter((b) => b.school_id === schoolId);
  }

  async saveBatch(batch: ProductBatch): Promise<void> {
    await putToStore(STORES.PRODUCT_BATCHES, batch);
  }

  async saveMovement(movement: StockMovement): Promise<void> {
    await putToStore(STORES.STOCK_MOVEMENTS, movement);
  }

  async getMovements(schoolId: string, productId?: string): Promise<StockMovement[]> {
    const all = await getAllFromStore<StockMovement>(STORES.STOCK_MOVEMENTS);
    return all
      .filter((m) => m.school_id === schoolId && (!productId || m.product_id === productId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getAllMovements(schoolId: string): Promise<StockMovement[]> {
    return this.getMovements(schoolId);
  }

  async saveAdjustment(adjustment: StockAdjustment): Promise<void> {
    await putToStore(STORES.STOCK_ADJUSTMENTS, adjustment);
  }

  async getAdjustments(schoolId: string): Promise<StockAdjustment[]> {
    const all = await getAllFromStore<StockAdjustment>(STORES.STOCK_ADJUSTMENTS);
    return all
      .filter((a) => a.school_id === schoolId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export class IndexedPurchaseRepository implements IPurchaseRepository {
  async getAll(schoolId: string): Promise<Purchase[]> {
    const all = await getAllFromStore<Purchase>(STORES.PURCHASES);
    return all
      .filter((p) => p.school_id === schoolId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getById(id: string): Promise<Purchase | undefined> {
    return getFromStore<Purchase>(STORES.PURCHASES, id);
  }

  async getItems(purchaseId: string): Promise<PurchaseItem[]> {
    const all = await getAllFromStore<PurchaseItem>(STORES.PURCHASE_ITEMS);
    return all.filter((item) => item.purchase_id === purchaseId);
  }

  async save(purchase: Purchase, items: PurchaseItem[]): Promise<void> {
    await runAtomicTransaction(
      [STORES.PURCHASES, STORES.PURCHASE_ITEMS],
      'readwrite',
      (stores) => {
        stores[STORES.PURCHASES].put(purchase);
        for (const item of items) {
          stores[STORES.PURCHASE_ITEMS].put(item);
        }
      }
    );
  }

  async savePayment(payment: PurchasePayment): Promise<void> {
    await putToStore(STORES.PURCHASE_PAYMENTS, payment);
  }

  async getPayments(purchaseId: string): Promise<PurchasePayment[]> {
    const all = await getAllFromStore<PurchasePayment>(STORES.PURCHASE_PAYMENTS);
    return all.filter((p) => p.purchase_id === purchaseId);
  }
}

export class IndexedSaleRepository implements ISaleRepository {
  async getAll(schoolId: string): Promise<Sale[]> {
    const all = await getAllFromStore<Sale>(STORES.SALES);
    return all
      .filter((s) => s.school_id === schoolId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getById(id: string): Promise<Sale | undefined> {
    return getFromStore<Sale>(STORES.SALES, id);
  }

  async getItems(saleId: string): Promise<SaleItem[]> {
    const all = await getAllFromStore<SaleItem>(STORES.SALE_ITEMS);
    return all.filter((item) => item.sale_id === saleId);
  }

  async save(sale: Sale, items: SaleItem[]): Promise<void> {
    await runAtomicTransaction(
      [STORES.SALES, STORES.SALE_ITEMS],
      'readwrite',
      (stores) => {
        stores[STORES.SALES].put(sale);
        for (const item of items) {
          stores[STORES.SALE_ITEMS].put(item);
        }
      }
    );
  }

  async updateStatus(saleId: string, status: Sale['status'], voidReason?: string, voidBy?: string): Promise<void> {
    const sale = await this.getById(saleId);
    if (sale) {
      sale.status = status;
      if (status === 'Dibatalkan') {
        sale.void_reason = voidReason;
        sale.void_by = voidBy;
        sale.void_at = new Date().toISOString();
      }
      await putToStore(STORES.SALES, sale);
    }
  }
}

export class IndexedCashRepository implements ICashRepository {
  async getActiveSession(schoolId: string): Promise<CashSession | undefined> {
    const all = await getAllFromStore<CashSession>(STORES.CASH_SESSIONS);
    return all.find((s) => s.school_id === schoolId && s.status === 'OPEN');
  }

  async getAllSessions(schoolId: string): Promise<CashSession[]> {
    const all = await getAllFromStore<CashSession>(STORES.CASH_SESSIONS);
    return all
      .filter((s) => s.school_id === schoolId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getSessionById(id: string): Promise<CashSession | undefined> {
    return getFromStore<CashSession>(STORES.CASH_SESSIONS, id);
  }

  async saveSession(session: CashSession): Promise<void> {
    await putToStore(STORES.CASH_SESSIONS, session);
  }

  async saveTransaction(tx: CashTransaction): Promise<void> {
    await putToStore(STORES.CASH_TRANSACTIONS, tx);
  }

  async getTransactionsBySession(sessionId: string): Promise<CashTransaction[]> {
    const all = await getAllFromStore<CashTransaction>(STORES.CASH_TRANSACTIONS);
    return all
      .filter((tx) => tx.cash_session_id === sessionId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export class IndexedUserRepository implements IUserRepository {
  async getAll(schoolId: string): Promise<User[]> {
    const all = await getAllFromStore<User>(STORES.USERS);
    return all.filter((u) => u.school_id === schoolId && !u.deleted_at);
  }

  async getById(id: string): Promise<User | undefined> {
    return getFromStore<User>(STORES.USERS, id);
  }

  async getByUsername(username: string): Promise<User | undefined> {
    const all = await getAllFromStore<User>(STORES.USERS);
    return all.find((u) => u.username.toLowerCase() === username.trim().toLowerCase() && !u.deleted_at);
  }

  async save(user: User): Promise<void> {
    await putToStore(STORES.USERS, user);
  }

  async getRoles(): Promise<Role[]> {
    return getAllFromStore<Role>(STORES.ROLES);
  }

  async saveRole(role: Role): Promise<void> {
    await putToStore(STORES.ROLES, role);
  }
}

export class IndexedAuditRepository implements IAuditRepository {
  async log(audit: AuditLog): Promise<void> {
    await putToStore(STORES.AUDIT_LOGS, audit);
  }

  async getAll(schoolId: string): Promise<AuditLog[]> {
    const all = await getAllFromStore<AuditLog>(STORES.AUDIT_LOGS);
    return all
      .filter((l) => l.school_id === schoolId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export class IndexedSettingsRepository implements ISettingsRepository {
  async getSettings(schoolId: string): Promise<AppSettings | undefined> {
    const all = await getAllFromStore<AppSettings>(STORES.SETTINGS);
    return all.find((s) => s.school_id === schoolId);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await putToStore(STORES.SETTINGS, settings);
  }

  async getSchool(schoolId: string): Promise<School | undefined> {
    return getFromStore<School>(STORES.SCHOOLS, schoolId);
  }

  async saveSchool(school: School): Promise<void> {
    await putToStore(STORES.SCHOOLS, school);
  }

  async getCooperative(schoolId: string): Promise<Cooperative | undefined> {
    const all = await getAllFromStore<Cooperative>(STORES.COOPERATIVES);
    return all.find((c) => c.school_id === schoolId);
  }

  async saveCooperative(cooperative: Cooperative): Promise<void> {
    await putToStore(STORES.COOPERATIVES, cooperative);
  }
}
