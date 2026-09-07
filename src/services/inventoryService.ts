import {
  Product,
  ProductBatch,
  StockMovement,
  StockAdjustment,
  BatchAllocation,
} from '../domain/types';
import { productRepo, stockRepo, settingsRepo } from '../repositories';
import { logActivity } from './auditService';

export interface BatchAllocationResult {
  allocations: BatchAllocation[];
  totalCogs: number;
  remainingRequestedQty: number;
}

export async function allocateStockForSale(
  schoolId: string,
  productId: string,
  quantity: number
): Promise<BatchAllocationResult> {
  const settings = await settingsRepo.getSettings(schoolId);
  const hppMethod = settings?.hpp_method || 'FIFO';

  const batches = await stockRepo.getBatchesByProduct(productId);
  const activeBatches = batches.filter((b) => b.remaining_qty > 0 && b.status === 'Aktif');

  if (hppMethod === 'AVERAGE') {
    // Average Cost calculation
    let totalQty = 0;
    let totalValue = 0;
    for (const b of activeBatches) {
      totalQty += b.remaining_qty;
      totalValue += b.remaining_qty * b.purchase_price;
    }
    const avgPrice = totalQty > 0 ? Math.round(totalValue / totalQty) : 0;

    let needed = quantity;
    const allocations: BatchAllocation[] = [];
    for (const b of activeBatches) {
      if (needed <= 0) break;
      const take = Math.min(needed, b.remaining_qty);
      allocations.push({
        batch_id: b.id,
        batch_number: b.batch_number,
        qty: take,
        purchase_price: avgPrice, // using average price for HPP
      });
      needed -= take;
    }

    const totalCogs = allocations.reduce((sum, a) => sum + a.qty * a.purchase_price, 0);
    return {
      allocations,
      totalCogs,
      remainingRequestedQty: needed,
    };
  } else {
    // Standard FIFO: sort by created_at ascending (oldest first)
    const sorted = [...activeBatches].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let needed = quantity;
    const allocations: BatchAllocation[] = [];
    for (const b of sorted) {
      if (needed <= 0) break;
      const take = Math.min(needed, b.remaining_qty);
      allocations.push({
        batch_id: b.id,
        batch_number: b.batch_number,
        qty: take,
        purchase_price: b.purchase_price,
      });
      needed -= take;
    }

    const totalCogs = allocations.reduce((sum, a) => sum + a.qty * a.purchase_price, 0);
    return {
      allocations,
      totalCogs,
      remainingRequestedQty: needed,
    };
  }
}

export async function adjustStock(params: {
  school_id: string;
  product_id: string;
  batch_id: string;
  new_qty: number;
  reason: string;
  user_id: string;
  user_name: string;
}): Promise<void> {
  const batches = await stockRepo.getBatchesByProduct(params.product_id);
  const targetBatch = batches.find((b) => b.id === params.batch_id);
  if (!targetBatch) {
    throw new Error('Batch tidak ditemukan.');
  }

  const oldQty = targetBatch.remaining_qty;
  const difference = params.new_qty - oldQty;

  targetBatch.remaining_qty = params.new_qty;
  targetBatch.status = params.new_qty === 0 ? 'Habis' : 'Aktif';
  await stockRepo.saveBatch(targetBatch);

  // Recalculate total product stock
  const allBatches = await stockRepo.getBatchesByProduct(params.product_id);
  const totalStock = allBatches.reduce((acc, b) => acc + (b.status === 'Aktif' ? b.remaining_qty : 0), 0);
  const product = await productRepo.getById(params.product_id);
  if (product) {
    product.total_stock = totalStock;
    product.updated_at = new Date().toISOString();
    await productRepo.save(product);
  }

  // Record adjustment
  const adjustment: StockAdjustment = {
    id: 'adj_' + Date.now(),
    school_id: params.school_id,
    product_id: params.product_id,
    batch_id: params.batch_id,
    old_qty: oldQty,
    new_qty: params.new_qty,
    difference,
    reason: params.reason,
    user_id: params.user_id,
    user_name: params.user_name,
    created_at: new Date().toISOString(),
  };
  await stockRepo.saveAdjustment(adjustment);

  // Record stock movement
  const movement: StockMovement = {
    id: 'mov_' + Date.now(),
    school_id: params.school_id,
    product_id: params.product_id,
    batch_id: params.batch_id,
    movement_type: 'ADJUSTMENT',
    qty: difference,
    reference_id: adjustment.id,
    notes: `Penyesuaian stok: ${params.reason}`,
    user_id: params.user_id,
    user_name: params.user_name,
    created_at: new Date().toISOString(),
  };
  await stockRepo.saveMovement(movement);

  // Audit
  await logActivity({
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: 'Penyesuaian Stok',
    module: 'Inventory',
    entity: 'ProductBatch',
    entity_id: params.batch_id,
    old_value: `Qty: ${oldQty}`,
    new_value: `Qty: ${params.new_qty} (${params.reason})`,
  });
}

export async function markDamagedOrExpired(params: {
  school_id: string;
  product_id: string;
  batch_id: string;
  qty: number;
  type: 'DAMAGE' | 'EXPIRED';
  reason: string;
  user_id: string;
  user_name: string;
}): Promise<void> {
  const batches = await stockRepo.getBatchesByProduct(params.product_id);
  const targetBatch = batches.find((b) => b.id === params.batch_id);
  if (!targetBatch) throw new Error('Batch tidak ditemukan.');

  if (params.qty > targetBatch.remaining_qty) {
    throw new Error('Jumlah melebihi sisa stok batch.');
  }

  targetBatch.remaining_qty -= params.qty;
  if (targetBatch.remaining_qty <= 0) {
    targetBatch.status = params.type === 'EXPIRED' ? 'Kedaluwarsa' : 'Habis';
  }
  await stockRepo.saveBatch(targetBatch);

  // Update product total stock
  const allBatches = await stockRepo.getBatchesByProduct(params.product_id);
  const totalStock = allBatches.reduce((acc, b) => acc + (b.status === 'Aktif' ? b.remaining_qty : 0), 0);
  const product = await productRepo.getById(params.product_id);
  if (product) {
    product.total_stock = totalStock;
    await productRepo.save(product);
  }

  // Stock Movement
  await stockRepo.saveMovement({
    id: 'mov_' + Date.now(),
    school_id: params.school_id,
    product_id: params.product_id,
    batch_id: params.batch_id,
    movement_type: params.type,
    qty: -params.qty,
    notes: `${params.type === 'DAMAGE' ? 'Barang Rusak' : 'Barang Kedaluwarsa'}: ${params.reason}`,
    user_id: params.user_id,
    user_name: params.user_name,
    created_at: new Date().toISOString(),
  });

  // Audit
  await logActivity({
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: params.type === 'DAMAGE' ? 'Pencatatan Barang Rusak' : 'Pencatatan Kedaluwarsa',
    module: 'Inventory',
    entity: 'ProductBatch',
    entity_id: params.batch_id,
    old_value: `Sisa: ${targetBatch.remaining_qty + params.qty}`,
    new_value: `Dikurangi ${params.qty} (${params.reason})`,
  });
}

export async function getInventoryAlerts(schoolId: string): Promise<{
  lowStockProducts: Product[];
  expiringBatches: (ProductBatch & { product_name: string; days_left: number })[];
}> {
  const products = await productRepo.getAll(schoolId);
  const lowStockProducts = products.filter((p) => p.total_stock <= p.min_stock && p.status === 'Active');

  const allBatches = await stockRepo.getAllBatches(schoolId);
  const now = new Date();
  const expiringBatches: (ProductBatch & { product_name: string; days_left: number })[] = [];

  for (const b of allBatches) {
    if (b.status === 'Aktif' && b.remaining_qty > 0 && b.expiry_date) {
      const expDate = new Date(b.expiry_date);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 45) {
        const prd = products.find((p) => p.id === b.product_id);
        expiringBatches.push({
          ...b,
          product_name: prd ? prd.name : 'Unknown Product',
          days_left: diffDays,
        });
      }
    }
  }

  return { lowStockProducts, expiringBatches };
}
