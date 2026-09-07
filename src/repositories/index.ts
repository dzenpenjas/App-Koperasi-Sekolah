import {
  IndexedProductRepository,
  IndexedCategoryRepository,
  IndexedUnitRepository,
  IndexedSupplierRepository,
  IndexedStockRepository,
  IndexedPurchaseRepository,
  IndexedSaleRepository,
  IndexedCashRepository,
  IndexedUserRepository,
  IndexedAuditRepository,
  IndexedSettingsRepository,
} from './indexeddb/repositoryImpl';

export const productRepo = new IndexedProductRepository();
export const categoryRepo = new IndexedCategoryRepository();
export const unitRepo = new IndexedUnitRepository();
export const supplierRepo = new IndexedSupplierRepository();
export const stockRepo = new IndexedStockRepository();
export const purchaseRepo = new IndexedPurchaseRepository();
export const saleRepo = new IndexedSaleRepository();
export const cashRepo = new IndexedCashRepository();
export const userRepo = new IndexedUserRepository();
export const auditRepo = new IndexedAuditRepository();
export const settingsRepo = new IndexedSettingsRepository();
