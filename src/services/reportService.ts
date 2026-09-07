import { saleRepo, productRepo, stockRepo, cashRepo } from '../repositories';

export interface DashboardMetrics {
  todaySalesTotal: number;
  todayTransactionCount: number;
  todayGrossProfit: number;
  currentCashBalance: number;
  lowStockCount: number;
  expiringCount: number;
  activeSessionId?: string;
  activeSessionCashier?: string;
}

export async function getDashboardMetrics(schoolId: string): Promise<DashboardMetrics> {
  const todayPrefix = new Date().toISOString().slice(0, 10);

  // 1. Sales
  const allSales = await saleRepo.getAll(schoolId);
  const paidSales = allSales.filter((s) => s.status === 'Dibayar');
  const todaySales = paidSales.filter((s) => s.sale_date.startsWith(todayPrefix));

  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.grand_total, 0);
  const todayTransactionCount = todaySales.length;
  const todayGrossProfit = todaySales.reduce((acc, s) => acc + s.profit_total, 0);

  // 2. Cash
  const activeSession = await cashRepo.getActiveSession(schoolId);
  const currentCashBalance = activeSession ? activeSession.expected_closing_cash : 0;

  // 3. Products
  const products = await productRepo.getAll(schoolId);
  const lowStockCount = products.filter((p) => p.status === 'Active' && p.total_stock <= p.min_stock).length;

  // 4. Expiring
  const batches = await stockRepo.getAllBatches(schoolId);
  const now = new Date();
  let expiringCount = 0;
  for (const b of batches) {
    if (b.status === 'Aktif' && b.remaining_qty > 0 && b.expiry_date) {
      const exp = new Date(b.expiry_date);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 45) {
        expiringCount++;
      }
    }
  }

  return {
    todaySalesTotal,
    todayTransactionCount,
    todayGrossProfit,
    currentCashBalance,
    lowStockCount,
    expiringCount,
    activeSessionId: activeSession?.id,
    activeSessionCashier: activeSession?.user_name,
  };
}

export async function getStockValuation(schoolId: string): Promise<{
  totalItems: number;
  totalQty: number;
  totalValuation: number;
}> {
  const batches = await stockRepo.getAllBatches(schoolId);
  const activeBatches = batches.filter((b) => b.status === 'Aktif' && b.remaining_qty > 0);

  const totalQty = activeBatches.reduce((acc, b) => acc + b.remaining_qty, 0);
  const totalValuation = activeBatches.reduce((acc, b) => acc + b.remaining_qty * b.purchase_price, 0);

  const products = await productRepo.getAll(schoolId);
  const activeProducts = products.filter((p) => p.status === 'Active');

  return {
    totalItems: activeProducts.length,
    totalQty,
    totalValuation,
  };
}
