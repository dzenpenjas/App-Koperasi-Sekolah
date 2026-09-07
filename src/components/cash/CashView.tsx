import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  History,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cashRepo } from '../../repositories';
import { CashSession, CashTransaction, CashTransactionType } from '../../domain/types';
import {
  openCashSession,
  recordCashTransaction,
  closeCashSession,
} from '../../services/cashService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const CashView: React.FC = () => {
  const { school, currentUser, activeSession, refreshContext, notify } = useApp();

  const [allSessions, setAllSessions] = useState<CashSession[]>([]);
  const [sessionTransactions, setSessionTransactions] = useState<CashTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [initialFloat, setInitialFloat] = useState(100000);

  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<CashTransactionType>('OUT');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txCategory, setTxCategory] = useState<string>('Operasional');
  const [txDesc, setTxDesc] = useState<string>('');

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [discrepancyNote, setDiscrepancyNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = useCallback(async () => {
    if (!school) return;
    try {
      const sessions = await cashRepo.getAllSessions(school.id);
      setAllSessions(sessions);

      if (activeSession) {
        const txs = await cashRepo.getTransactionsBySession(activeSession.id);
        setSessionTransactions(txs);
      } else {
        setSessionTransactions([]);
      }
    } catch (err) {
      console.error('Failed to load cash data:', err);
    }
  }, [school, activeSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenSession = async () => {
    if (!school || !currentUser) return;
    setIsProcessing(true);
    try {
      await openCashSession({
        school_id: school.id,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        initial_cash: initialFloat,
      });
      setShowOpenModal(false);
      await refreshContext();
      notify('Sesi kas baru berhasil dibuka.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuka sesi kas';
      notify(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!school || !currentUser || !activeSession) return;
    if (txAmount <= 0) {
      notify('Nominal kas harus lebih dari 0.', 'error');
      return;
    }
    if (!txDesc.trim()) {
      notify('Keterangan kas wajib diisi.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await recordCashTransaction({
        school_id: school.id,
        cash_session_id: activeSession.id,
        transaction_type: txType,
        amount: txAmount,
        category: txCategory,
        description: txDesc.trim(),
        user_id: currentUser.id,
        user_name: currentUser.full_name,
      });

      setShowTxModal(false);
      setTxAmount(0);
      setTxDesc('');
      await loadData();
      await refreshContext();
      notify('Transaksi kas berhasil dicatat.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat kas';
      notify(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSession = async () => {
    if (!school || !currentUser || !activeSession) return;
    setIsProcessing(true);
    try {
      await closeCashSession({
        school_id: school.id,
        cash_session_id: activeSession.id,
        actual_cash: actualCashInput,
        discrepancy_notes: discrepancyNote,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
      });

      setShowCloseModal(false);
      await loadData();
      await refreshContext();
      notify('Sesi kas berhasil ditutup dan direkap.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menutup kas';
      notify(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const expectedCash = activeSession ? activeSession.expected_closing_cash : 0;
  const discrepancyPreview = actualCashInput - expectedCash;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Kas Laci</h2>
          <p className="text-xs text-slate-500">
            Pencatatan kas masuk/keluar, saldo laci realtime, dan rekap penutupan kas harian
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold text-slate-700">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'ACTIVE' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Sesi Kas Aktif
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'HISTORY' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Riwayat Sesi Kas
          </button>
        </div>
      </div>

      {activeTab === 'ACTIVE' && (
        <div className="space-y-5">
          {/* Active Session Card */}
          {activeSession ? (
            <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700/70 border border-emerald-500/40 flex items-center justify-center font-bold text-amber-300">
                    <Unlock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">Sesi Kas Sedang Berjalan</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <p className="text-xs text-emerald-200">
                      Dibuka oleh: <strong>{activeSession.user_name}</strong> • {formatDate(activeSession.open_time)}
                    </p>
                  </div>
                </div>

                {/* Session Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTxType('IN');
                      setTxCategory('Kas Masuk');
                      setShowTxModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Kas Masuk</span>
                  </button>
                  <button
                    onClick={() => {
                      setTxType('OUT');
                      setTxCategory('Operasional');
                      setShowTxModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-300" />
                    <span>Kas Keluar</span>
                  </button>
                  <button
                    onClick={() => {
                      setActualCashInput(activeSession.expected_closing_cash);
                      setDiscrepancyNote('');
                      setShowCloseModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Tutup Sesi Kas</span>
                  </button>
                </div>
              </div>

              {/* Grid Metrics for current session */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-700/40">
                  <span className="text-[10px] text-emerald-200 uppercase font-semibold">Modal Awal Laci</span>
                  <div className="text-base sm:text-lg font-bold mt-0.5">
                    {formatCurrency(activeSession.initial_cash)}
                  </div>
                </div>
                <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-700/40">
                  <span className="text-[10px] text-emerald-200 uppercase font-semibold">Total Penjualan Tunai</span>
                  <div className="text-base sm:text-lg font-bold text-amber-300 mt-0.5">
                    +{formatCurrency(activeSession.total_sales_cash)}
                  </div>
                </div>
                <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-700/40">
                  <span className="text-[10px] text-emerald-200 uppercase font-semibold">Kas Masuk / Keluar Lain</span>
                  <div className="text-base sm:text-lg font-bold mt-0.5">
                    <span className="text-emerald-300">+{formatCurrency(activeSession.total_in_cash)}</span> /{' '}
                    <span className="text-rose-300">-{formatCurrency(activeSession.total_out_cash)}</span>
                  </div>
                </div>
                <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-600/60">
                  <span className="text-[10px] text-amber-300 uppercase font-bold">Saldo Akhir Teoritis</span>
                  <div className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
                    {formatCurrency(activeSession.expected_closing_cash)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Sesi Kas Saat Ini Belum Dibuka</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Buka sesi kas baru untuk memasukkan modal awal dan mencatat pergerakan uang tunai harian di koperasi.
              </p>
              <button
                onClick={() => setShowOpenModal(true)}
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Buka Sesi Kas Baru</span>
              </button>
            </div>
          )}

          {/* Sesi Kas Transactions Table */}
          {activeSession && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                  Mutasi Transaksi Pada Sesi Kas Ini ({sessionTransactions.length})
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Waktu</th>
                      <th className="py-2.5 px-4 text-center">Jenis</th>
                      <th className="py-2.5 px-4">Kategori</th>
                      <th className="py-2.5 px-4">Keterangan</th>
                      <th className="py-2.5 px-4 text-right">Nominal</th>
                      <th className="py-2.5 px-4">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessionTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          Belum ada mutasi kas tercatat dalam sesi ini.
                        </td>
                      </tr>
                    ) : (
                      sessionTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4 text-slate-500">{formatDate(tx.created_at)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                                tx.transaction_type === 'SALE' || tx.transaction_type === 'IN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-700">{tx.category}</td>
                          <td className="py-2.5 px-4 text-slate-600">{tx.description}</td>
                          <td className="py-2.5 px-4 text-right font-bold">
                            <span
                              className={
                                tx.transaction_type === 'SALE' || tx.transaction_type === 'IN'
                                  ? 'text-emerald-700'
                                  : 'text-rose-600'
                              }
                            >
                              {tx.transaction_type === 'SALE' || tx.transaction_type === 'IN' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">{tx.user_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sessions History */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Waktu Buka</th>
                  <th className="py-3 px-4">Waktu Tutup</th>
                  <th className="py-3 px-4">Kasir</th>
                  <th className="py-3 px-4 text-right">Modal Awal</th>
                  <th className="py-3 px-4 text-right">Total Penjualan</th>
                  <th className="py-3 px-4 text-right">Saldo Teoritis</th>
                  <th className="py-3 px-4 text-right">Saldo Fisik</th>
                  <th className="py-3 px-4 text-right">Selisih</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-medium text-slate-800">{formatDate(s.open_time)}</td>
                    <td className="py-3 px-4 text-slate-500">{s.close_time ? formatDate(s.close_time) : '-'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{s.user_name}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(s.initial_cash)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-800">
                      {formatCurrency(s.total_sales_cash)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(s.expected_closing_cash)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {s.actual_closing_cash !== undefined ? formatCurrency(s.actual_closing_cash) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {s.discrepancy !== undefined ? (
                        <span
                          className={
                            s.discrepancy === 0
                              ? 'text-emerald-700'
                              : s.discrepancy > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }
                        >
                          {s.discrepancy >= 0 ? `+${formatCurrency(s.discrepancy)}` : formatCurrency(s.discrepancy)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Buka Sesi Kas */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-sm text-slate-900">Buka Sesi Kas Baru</span>
              <button onClick={() => setShowOpenModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Masukkan jumlah saldo uang tunai fisik yang ada di dalam laci kasir saat ini:
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Modal Awal Kasir (Rp):</label>
              <input
                type="number"
                min="0"
                value={initialFloat}
                onChange={(e) => setInitialFloat(Number(e.target.value) || 0)}
                className="w-full text-base font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowOpenModal(false)}
                className="flex-1 py-2 text-xs font-semibold border rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                disabled={isProcessing}
                onClick={handleOpenSession}
                className="flex-1 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm"
              >
                {isProcessing ? 'Membuka...' : 'Buka Kas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kas Masuk / Keluar */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-sm text-slate-900">
                Catat {txType === 'IN' ? 'Kas Masuk' : 'Kas Keluar (Petty Cash)'}
              </span>
              <button onClick={() => setShowTxModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori Transaksi:</label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full p-2 border rounded-xl text-xs font-semibold"
              >
                {txType === 'OUT' ? (
                  <>
                    <option value="Operasional">Operasional Harian</option>
                    <option value="Konsumsi">Konsumsi Guru / Petugas</option>
                    <option value="ATK & Perlengkapan">ATK & Perlengkapan Toko</option>
                    <option value="Transportasi">Transportasi Pengambilan Barang</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </>
                ) : (
                  <>
                    <option value="Kas Masuk">Setoran Tambahan Modal</option>
                    <option value="Pengembalian Kasbon">Pengembalian Kasbon</option>
                    <option value="Lain-lain">Penerimaan Lain-lain</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nominal Uang (Rp):</label>
              <input
                type="number"
                min="0"
                value={txAmount || ''}
                onChange={(e) => setTxAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full text-base font-bold px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Keterangan / Keperluan (Wajib):</label>
              <input
                type="text"
                placeholder="Contoh: Beli kantong plastik kresek 2 pack..."
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                className="w-full p-2 border rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowTxModal(false)}
                className="flex-1 py-2 text-xs font-semibold border rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                disabled={isProcessing}
                onClick={handleAddTransaction}
                className="flex-1 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm"
              >
                {isProcessing ? 'Menyimpan...' : 'Simpan Transaksi Kas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tutup Sesi Kas */}
      {showCloseModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-base text-slate-900">Rekap & Tutup Sesi Kas</span>
              <button onClick={() => setShowCloseModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Modal Awal:</span>
                <span>{formatCurrency(activeSession.initial_cash)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Penjualan Tunai:</span>
                <span className="text-emerald-700 font-bold">+{formatCurrency(activeSession.total_sales_cash)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kas Masuk Lainnya:</span>
                <span>+{formatCurrency(activeSession.total_in_cash)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kas Keluar / Beban:</span>
                <span className="text-rose-600">-{formatCurrency(activeSession.total_out_cash)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t pt-1 text-sm">
                <span>Saldo Kas Teoritis:</span>
                <span>{formatCurrency(expectedCash)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Hitungan Kas Fisik Sebenarnya di Laci (Rp):
              </label>
              <input
                type="number"
                min="0"
                value={actualCashInput || ''}
                onChange={(e) => setActualCashInput(Number(e.target.value) || 0)}
                className="w-full text-lg font-black text-slate-900 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Discrepancy indicator */}
            <div
              className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                discrepancyPreview === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>{discrepancyPreview === 0 ? '✓ Sesuai (Tanpa Selisih)' : 'Selisih Kas:'}</span>
              <strong className="text-sm">
                {discrepancyPreview >= 0
                  ? `+${formatCurrency(discrepancyPreview)}`
                  : formatCurrency(discrepancyPreview)}
              </strong>
            </div>

            {discrepancyPreview !== 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Catatan Penjelasan Selisih:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Selisih uang receh pecahan 500 permen..."
                  value={discrepancyNote}
                  onChange={(e) => setDiscrepancyNote(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                disabled={isProcessing}
                onClick={handleCloseSession}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-xs shadow-sm"
              >
                {isProcessing ? 'Menutup...' : 'Tutup & Simpan Sesi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
