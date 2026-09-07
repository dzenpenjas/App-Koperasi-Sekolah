import {
  Purchase,
  PurchaseItem,
  ProductBatch,
} from '../domain/types';
import {
  purchaseRepo,
  productRepo,
  stockRepo,
  supplierRepo,
} from '../repositories';
import { logActivity } from './auditService';

export async function generatePurchaseNumber(schoolId: string): Promise<string> {
  const purchases = await purchaseRepo.getAll(schoolId);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PO-${dateStr}-`;

  const todayPurchases = purchases.filter((p) => p.purchase_number.startsWith(prefix));
  const nextSeq = String(todayPurchases.length + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

export async function createPurchase(params: {
  school_id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date: string;
  items: {
    product_id: string;
    product_code: string;
    product_name: string;
    qty: number;
    purchase_price: number;
    expiry_date?: string;
  }[];
  discount_amount: number;
  additional_fee: number;
  paid_amount: number;
  notes?: string;
  status: 'Draft' | 'Final';
  user_id: string;
  user_name: string;
}): Promise<Purchase> {
  if (params.items.length === 0) {
    throw new Error('Pembelian harus memiliki minimal satu barang.');
  }

  const purchaseNumber = await generatePurchaseNumber(params.school_id);
  const now = new Date().toISOString();
  const purchaseId = 'pur_' + Date.now();

  let totalAmount = 0;
  const purchaseItems: PurchaseItem[] = [];

  for (const item of params.items) {
    if (item.qty <= 0) throw new Error(`Jumlah barang ${item.product_name} harus lebih besar dari 0.`);
    if (item.purchase_price <= 0) throw new Error(`Harga beli ${item.product_name} harus lebih besar dari 0.`);

    const subtotal = item.qty * item.purchase_price;
    totalAmount += subtotal;

    purchaseItems.push({
      id: 'puri_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      purchase_id: purchaseId,
      product_id: item.product_id,
      product_code: item.product_code,
      product_name: item.product_name,
      qty: item.qty,
      purchase_price: item.purchase_price,
      subtotal,
      expiry_date: item.expiry_date,
    });
  }

  const grandTotal = Math.max(0, totalAmount - (params.discount_amount || 0) + (params.additional_fee || 0));
  const paidAmount = params.paid_amount || 0;

  let paymentStatus: Purchase['payment_status'] = 'Belum Dibayar';
  if (paidAmount >= grandTotal) {
    paymentStatus = 'Lunas';
  } else if (paidAmount > 0) {
    paymentStatus = 'Sebagian';
  }

  const purchase: Purchase = {
    id: purchaseId,
    school_id: params.school_id,
    purchase_number: purchaseNumber,
    purchase_date: params.purchase_date || now.slice(0, 10),
    supplier_id: params.supplier_id,
    supplier_name: params.supplier_name,
    user_id: params.user_id,
    user_name: params.user_name,
    status: params.status,
    payment_status: paymentStatus,
    total_amount: totalAmount,
    discount_amount: params.discount_amount || 0,
    additional_fee: params.additional_fee || 0,
    grand_total: grandTotal,
    paid_amount: paidAmount,
    notes: params.notes,
    items: purchaseItems,
    created_at: now,
  };

  await purchaseRepo.save(purchase, purchaseItems);

  // If Final, instantly create batches and update stock!
  if (params.status === 'Final') {
    await applyFinalPurchaseStock(purchase, purchaseItems, params.user_id, params.user_name);
  }

  // Update supplier debt if not fully paid
  const remainingDebt = Math.max(0, grandTotal - paidAmount);
  if (remainingDebt > 0 && params.supplier_id) {
    await supplierRepo.updateDebt(params.supplier_id, remainingDebt);
  }

  await logActivity({
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: `Input Pembelian (${params.status})`,
    module: 'Procurement',
    entity: 'Purchase',
    entity_id: purchase.id,
    new_value: `${purchaseNumber} - ${params.supplier_name}: Rp ${grandTotal.toLocaleString('id-ID')} (${paymentStatus})`,
  });

  return purchase;
}

async function applyFinalPurchaseStock(
  purchase: Purchase,
  items: PurchaseItem[],
  userId: string,
  userName: string
): Promise<void> {
  const now = new Date().toISOString();

  for (const item of items) {
    const batchNumber = `BCH-${purchase.purchase_number.replace('PO-', '')}-${item.product_code}`;
    const batch: ProductBatch = {
      id: 'btc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      school_id: purchase.school_id,
      product_id: item.product_id,
      batch_number: batchNumber,
      purchase_id: purchase.id,
      purchase_price: item.purchase_price,
      initial_qty: item.qty,
      remaining_qty: item.qty,
      supplier_id: purchase.supplier_id,
      expiry_date: item.expiry_date,
      status: 'Aktif',
      created_at: now,
    };
    await stockRepo.saveBatch(batch);

    // Record stock movement
    await stockRepo.saveMovement({
      id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      school_id: purchase.school_id,
      product_id: item.product_id,
      batch_id: batch.id,
      movement_type: 'PURCHASE',
      qty: item.qty,
      reference_id: purchase.id,
      notes: `Pembelian PO: ${purchase.purchase_number}`,
      user_id: userId,
      user_name: userName,
      created_at: now,
    });

    // Update product stock
    const product = await productRepo.getById(item.product_id);
    if (product) {
      product.total_stock = (product.total_stock || 0) + item.qty;
      product.updated_at = now;
      await productRepo.save(product);
    }
  }
}
