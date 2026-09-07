/**
 * IndexedDB Database Layer for Koperasi Sekolah
 * Provides an atomic, schema-governed local storage engine.
 */

const DB_NAME = 'KoperasiSekolahDB';
const DB_VERSION = 1;

export const STORES = {
  SCHOOLS: 'schools',
  COOPERATIVES: 'cooperatives',
  USERS: 'users',
  ROLES: 'roles',
  CATEGORIES: 'categories',
  UNITS: 'units',
  SUPPLIERS: 'suppliers',
  PRODUCTS: 'products',
  PRICE_HISTORIES: 'price_histories',
  PRODUCT_BATCHES: 'product_batches',
  STOCK_MOVEMENTS: 'stock_movements',
  STOCK_ADJUSTMENTS: 'stock_adjustments',
  PURCHASES: 'purchases',
  PURCHASE_ITEMS: 'purchase_items',
  PURCHASE_PAYMENTS: 'purchase_payments',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  CASH_SESSIONS: 'cash_sessions',
  CASH_TRANSACTIONS: 'cash_transactions',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbInstance: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if not exist
      if (!db.objectStoreNames.contains(STORES.SCHOOLS)) {
        db.createObjectStore(STORES.SCHOOLS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.COOPERATIVES)) {
        db.createObjectStore(STORES.COOPERATIVES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const store = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        store.createIndex('username', 'username', { unique: true });
        store.createIndex('school_id', 'school_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.ROLES)) {
        db.createObjectStore(STORES.ROLES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        const store = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.UNITS)) {
        const store = db.createObjectStore(STORES.UNITS, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
        const store = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('code', 'code', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const store = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('code', 'code', { unique: false });
        store.createIndex('category_id', 'category_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PRICE_HISTORIES)) {
        const store = db.createObjectStore(STORES.PRICE_HISTORIES, { keyPath: 'id' });
        store.createIndex('product_id', 'product_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PRODUCT_BATCHES)) {
        const store = db.createObjectStore(STORES.PRODUCT_BATCHES, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('product_id', 'product_id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.STOCK_MOVEMENTS)) {
        const store = db.createObjectStore(STORES.STOCK_MOVEMENTS, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('product_id', 'product_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.STOCK_ADJUSTMENTS)) {
        const store = db.createObjectStore(STORES.STOCK_ADJUSTMENTS, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PURCHASES)) {
        const store = db.createObjectStore(STORES.PURCHASES, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('purchase_number', 'purchase_number', { unique: true });
        store.createIndex('purchase_date', 'purchase_date', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PURCHASE_ITEMS)) {
        const store = db.createObjectStore(STORES.PURCHASE_ITEMS, { keyPath: 'id' });
        store.createIndex('purchase_id', 'purchase_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PURCHASE_PAYMENTS)) {
        const store = db.createObjectStore(STORES.PURCHASE_PAYMENTS, { keyPath: 'id' });
        store.createIndex('purchase_id', 'purchase_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const store = db.createObjectStore(STORES.SALES, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('sale_number', 'sale_number', { unique: true });
        store.createIndex('sale_date', 'sale_date', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SALE_ITEMS)) {
        const store = db.createObjectStore(STORES.SALE_ITEMS, { keyPath: 'id' });
        store.createIndex('sale_id', 'sale_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CASH_SESSIONS)) {
        const store = db.createObjectStore(STORES.CASH_SESSIONS, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CASH_TRANSACTIONS)) {
        const store = db.createObjectStore(STORES.CASH_TRANSACTIONS, { keyPath: 'id' });
        store.createIndex('cash_session_id', 'cash_session_id', { unique: false });
        store.createIndex('school_id', 'school_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.AUDIT_LOGS)) {
        const store = db.createObjectStore(STORES.AUDIT_LOGS, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        const store = db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        store.createIndex('school_id', 'school_id', { unique: true });
      }
    };
  });
}

/**
 * Generic CRUD helper methods
 */
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getFromStore<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function putToStore<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function putMultipleToStore<T>(storeName: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const val of values) {
      store.put(val);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Execute atomic multi-store operation
 */
export async function runAtomicTransaction(
  storeNames: StoreName[],
  mode: IDBTransactionMode,
  callback: (stores: Record<string, IDBObjectStore>, tx: IDBTransaction) => Promise<void> | void
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const storesMap: Record<string, IDBObjectStore> = {};
    for (const name of storeNames) {
      storesMap[name] = tx.objectStore(name);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));

    try {
      Promise.resolve(callback(storesMap, tx)).catch((err) => {
        tx.abort();
        reject(err);
      });
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}
