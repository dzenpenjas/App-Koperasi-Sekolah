import {
  Sale,
  SaleItem,
  BatchAllocation,
} from '../domain/types';
import {
  saleRepo,
  productRepo,
  stockRepo,
  cashRepo,
} from '../repositories';
import { allocateStockForSale } from './inventoryService';
import { recordCashTransaction } from './cashService';
import { logActivity } from './auditService';

export interface CartItem {
  product_id: string;
  product_code: string;
  product_name: string;
  unit_name: string;
  unit_price: number;
  qty: number;
  available_stock: number;
}

export async function generateSaleNumber(schoolId: string): Promise<string> {
  const sales = await saleRepo.getAll(schoolId);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `KSR-${dateStr}-`;

  const todaySales = sales.filter((s) => s.sale_number.startsWith(prefix));
  const nextSeq = String(todaySales.length + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

export async function executeCheckout(params: {
  school_id: string;
  cart: CartItem[];
  discount_amount: number;
  paid_amount: number;
  notes?: string;
  user_id: string;
  user_name: string;
}): Promise<Sale> {
  if (params.cart.length === 0) {
    throw new Error('Keranjang belanja kosong.');
  }

  // 1. Verify stock for all items
  for (const item of params.cart) {
    const prd = await productRepo.getById(item.product_id);
    if (!prd || prd.status !== 'Active') {
      throw new Error(`Barang "${item.product_name}" tidak aktif atau tidak ditemukan.`);
    }
    if (item.qty > prd.total_stock) {
      throw new Error(`Stok barang "${item.product_name}" tidak mencukupi (Tersedia: ${prd.total_stock}, Diminta: ${item.qty}).`);
    }
  }

  const saleNumber = await generateSaleNumber(params.school_id);
  const now = new Date().toISOString();
  const saleId = 'sal_' + Date.now();

  let totalAmount = 0;
  let totalCogs = 0;
  const saleItems: SaleItem[] = [];

  // 2. Process batch allocations for each item
  for (const item of params.cart) {
    const subtotal = item.qty * item.unit_price;
    totalAmount += subtotal;

    const allocationResult = await allocateStockForSale(params.school_id, item.product_id, item.qty);
    if (allocationResult.remainingRequestedQty > 0) {
      throw new Error(`Stok batch untuk "${item.product_name}" tidak mencukupi.`);
    }

    totalCogs += allocationResult.totalCogs;

    const saleItem: SaleItem = {
      id: 'sali_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sale_id: saleId,
      product_id: item.product_id,
      product_code: item.product_code,
      product_name: item.product_name,
      unit_name: item.unit_name,
      qty: item.qty,
      unit_price: item.unit_price,
      subtotal,
      cogs_amount: allocationResult.totalCogs,
      batch_allocations: allocationResult.allocations,
    };
    saleItems.push(saleItem);

    // Deduct stock from batches
    for (const alloc of allocationResult.allocations) {
      const batches = await stockRepo.getBatchesByProduct(item.product_id);
      const batch = batches.find((b) => b.id === alloc.batch_id);
      if (batch) {
        batch.remaining_qty -= alloc.qty;
        if (batch.remaining_qty <= 0) {
          batch.remaining_qty = 0;
          batch.status = 'Habis';
        }
        await stockRepo.saveBatch(batch);
      }

      // Record stock movement
      await stockRepo.saveMovement({
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        school_id: params.school_id,
        product_id: item.product_id,
        batch_id: alloc.batch_id,
        movement_type: 'SALE',
        qty: -alloc.qty,
        reference_id: saleId,
        notes: `Penjualan ${saleNumber}`,
        user_id: params.user_id,
        user_name: params.user_name,
        created_at: now,
      });
    }

    // Update product total stock
    const allBatches = await stockRepo.getBatchesByProduct(item.product_id);
    const updatedTotalStock = allBatches.reduce(
      (acc, b) => acc + (b.status === 'Aktif' ? b.remaining_qty : 0),
      0
    );
    const product = await productRepo.getById(item.product_id);
    if (product) {
      product.total_stock = updatedTotalStock;
      product.updated_at = now;
      await productRepo.save(product);
    }
  }

  const grandTotal = Math.max(0, totalAmount - (params.discount_amount || 0));
  if (params.paid_amount < grandTotal) {
    throw new Error(`Nominal pembayaran (Rp ${params.paid_amount.toLocaleString('id-ID')}) kurang dari total belanja (Rp ${grandTotal.toLocaleString('id-ID')}).`);
  }

  const changeAmount = params.paid_amount - grandTotal;
  const profitTotal = grandTotal - totalCogs;

  const sale: Sale = {
    id: saleId,
    school_id: params.school_id,
    sale_number: saleNumber,
    sale_date: now,
    user_id: params.user_id,
    user_name: params.user_name,
    status: 'Dibayar',
    total_amount: totalAmount,
    discount_amount: params.discount_amount || 0,
    grand_total: grandTotal,
    cogs_total: totalCogs,
    profit_total: profitTotal,
    payment_method: 'Tunai',
    paid_amount: params.paid_amount,
    change_amount: changeAmount,
    notes: params.notes || '',
    items: saleItems,
    created_at: now,
  };

  await saleRepo.save(sale, saleItems);

  // Record Cash Transaction if cash session is active
  const activeSession = await cashRepo.getActiveSession(params.school_id);
  if (activeSession) {
    await recordCashTransaction({
      school_id: params.school_id,
      cash_session_id: activeSession.id,
      transaction_type: 'SALE',
      amount: grandTotal,
      category: 'Penjualan',
      description: `Penjualan ${saleNumber}`,
      reference_id: sale.id,
      user_id: params.user_id,
      user_name: params.user_name,
    });
  }

  // Append Audit Log
  await logActivity({
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: 'Penjualan Kasir',
    module: 'POS',
    entity: 'Sale',
    entity_id: sale.id,
    new_value: `${saleNumber} - Total: Rp ${grandTotal.toLocaleString('id-ID')}, Laba: Rp ${profitTotal.toLocaleString('id-ID')}`,
  });

  return sale;
}

export async function voidSale(params: {
  school_id: string;
  sale_id: string;
  void_reason: string;
  user_id: string;
  user_name: string;
}): Promise<void> {
  const sale = await saleRepo.getById(params.sale_id);
  if (!sale) throw new Error('Transaksi tidak ditemukan.');
  if (sale.status === 'Dibatalkan') throw new Error('Transaksi sudah dibatalkan sebelumnya.');

  const items = await saleRepo.getItems(params.sale_id);
  const now = new Date().toISOString();

  // Restore stock back to batches
  for (const item of items) {
    for (const alloc of item.batch_allocations) {
      const batches = await stockRepo.getBatchesByProduct(item.product_id);
      const batch = batches.find((b) => b.id === alloc.batch_id);
      if (batch) {
        batch.remaining_qty += alloc.qty;
        batch.status = 'Aktif';
        await stockRepo.saveBatch(batch);
      }

      // Record movement
      await stockRepo.saveMovement({
        id: 'mov_void_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        school_id: params.school_id,
        product_id: item.product_id,
        batch_id: alloc.batch_id,
        movement_type: 'VOID',
        qty: alloc.qty,
        reference_id: sale.id,
        notes: `Pembatalan (Void) ${sale.sale_number}: ${params.void_reason}`,
        user_id: params.user_id,
        user_name: params.user_name,
        created_at: now,
      });
    }

    // Recalculate product total stock
    const allBatches = await stockRepo.getBatchesByProduct(item.product_id);
    const updatedTotalStock = allBatches.reduce(
      (acc, b) => acc + (b.status === 'Aktif' ? b.remaining_qty : 0),
      0
    );
    const product = await productRepo.getById(item.product_id);
    if (product) {
      product.total_stock = updatedTotalStock;
      await productRepo.save(product);
    }
  }

  // Adjust Cash if active session exists
  const activeSession = await cashRepo.getActiveSession(params.school_id);
  if (activeSession) {
    await recordCashTransaction({
      school_id: params.school_id,
      cash_session_id: activeSession.id,
      transaction_type: 'ADJUSTMENT',
      amount: -sale.grand_total,
      category: 'Pembatalan Penjualan',
      description: `Void ${sale.sale_number} (${params.void_reason})`,
      reference_id: sale.id,
      user_id: params.user_id,
      user_name: params.user_name,
    });
  }

  // Update sale status
  await saleRepo.updateStatus(sale.id, 'Dibatalkan', params.void_reason, params.user_name);

  // Audit Log
  await logActivity({
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: 'Pembatalan Transaksi (Void)',
    module: 'POS',
    entity: 'Sale',
    entity_id: sale.id,
    old_value: `Status: Dibayar, Rp ${sale.grand_total}`,
    new_value: `Status: Dibatalkan (${params.void_reason})`,
  });
}
