import { CashSession, CashTransaction, CashTransactionType } from '../domain/types';
import { cashRepo } from '../repositories';
import { logActivity } from './auditService';

export async function getActiveCashSession(schoolId: string): Promise<CashSession | undefined> {
  return cashRepo.getActiveSession(schoolId);
}

export async function openCashSession(params: {
  school_id: string;
  user_id: string;
  user_name: string;
  initial_cash: number;
}): Promise<CashSession> {
  const existing = await cashRepo.getActiveSession(params.school_id);
  if (existing) {
    throw new Error('Sesi kas saat ini masih terbuka. Harap tutup sesi kas sebelumnya terlebih dahulu.');
  }

  const now = new Date().toISOString();
  const session: CashSession = {
    id: 'cs_' + Date.now(),
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    open_time: now,
    initial_cash: params.initial_cash,
    total_sales_cash: 0,
    total_in_cash: 0,
    total_out_cash: 0,
    expected_closing_cash: params.initial_cash,
    status: 'OPEN',
    created_at: now,
  };

  await cashRepo.saveSession(session);

  await logActivity({
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: 'Buka Sesi Kas',
    module: 'Cash Management',
    entity: 'CashSession',
    entity_id: session.id,
    new_value: `Saldo awal: Rp ${params.initial_cash.toLocaleString('id-ID')}`,
  });

  return session;
}

export async function recordCashTransaction(params: {
  school_id: string;
  cash_session_id: string;
  transaction_type: CashTransactionType;
  amount: number;
  category: string;
  description: string;
  reference_id?: string;
  user_id: string;
  user_name: string;
}): Promise<CashTransaction> {
  const session = await cashRepo.getSessionById(params.cash_session_id);
  if (!session || session.status !== 'OPEN') {
    throw new Error('Sesi kas tidak aktif atau sudah ditutup.');
  }

  const now = new Date().toISOString();
  const tx: CashTransaction = {
    id: 'ctx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    school_id: params.school_id,
    cash_session_id: params.cash_session_id,
    transaction_type: params.transaction_type,
    amount: params.amount,
    category: params.category,
    description: params.description,
    reference_id: params.reference_id,
    user_id: params.user_id,
    user_name: params.user_name,
    created_at: now,
  };

  await cashRepo.saveTransaction(tx);

  // Update session running totals
  if (params.transaction_type === 'SALE') {
    session.total_sales_cash += params.amount;
  } else if (params.transaction_type === 'IN') {
    session.total_in_cash += params.amount;
  } else if (params.transaction_type === 'OUT') {
    session.total_out_cash += params.amount;
  } else if (params.transaction_type === 'ADJUSTMENT') {
    // Adjustment can be positive or negative
    if (params.amount >= 0) {
      session.total_in_cash += params.amount;
    } else {
      session.total_out_cash += Math.abs(params.amount);
    }
  }

  session.expected_closing_cash =
    session.initial_cash +
    session.total_sales_cash +
    session.total_in_cash -
    session.total_out_cash;

  await cashRepo.saveSession(session);

  await logActivity({
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: `Transaksi Kas (${params.transaction_type})`,
    module: 'Cash Management',
    entity: 'CashTransaction',
    entity_id: tx.id,
    new_value: `${params.category}: Rp ${params.amount.toLocaleString('id-ID')} (${params.description})`,
  });

  return tx;
}

export async function closeCashSession(params: {
  school_id: string;
  cash_session_id: string;
  actual_cash: number;
  discrepancy_notes?: string;
  user_id: string;
  user_name: string;
}): Promise<CashSession> {
  const session = await cashRepo.getSessionById(params.cash_session_id);
  if (!session || session.status !== 'OPEN') {
    throw new Error('Sesi kas tidak ditemukan atau sudah ditutup.');
  }

  const discrepancy = params.actual_cash - session.expected_closing_cash;

  session.actual_closing_cash = params.actual_cash;
  session.discrepancy = discrepancy;
  session.discrepancy_notes = params.discrepancy_notes || '';
  session.status = 'CLOSED';
  session.close_time = new Date().toISOString();

  await cashRepo.saveSession(session);

  await logActivity({
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: 'Tutup Sesi Kas',
    module: 'Cash Management',
    entity: 'CashSession',
    entity_id: session.id,
    old_value: `Teoritis: Rp ${session.expected_closing_cash.toLocaleString('id-ID')}`,
    new_value: `Fisik: Rp ${params.actual_cash.toLocaleString('id-ID')}, Selisih: Rp ${discrepancy.toLocaleString('id-ID')}`,
  });

  return session;
}
