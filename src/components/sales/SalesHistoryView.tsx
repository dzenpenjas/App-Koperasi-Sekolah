import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  RotateCcw,
  Printer,
  Calendar,
  Eye,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { saleRepo } from '../../repositories';
import { Sale, SaleItem } from '../../domain/types';
import { voidSale } from '../../services/posService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const SalesHistoryView: React.FC = () => {
  const { school, currentUser, permissions, refreshContext, notify } = useApp();

  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Dibayar' | 'Dibatalkan'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // Void modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Reprint modal
  const [reprintSale, setReprintSale] = useState<Sale | null>(null);

  const loadSales = useCallback(async () => {
    if (!school) return;
    try {
      const data = await saleRepo.getAll(school.id);
      setSales(data);
    } catch (err) {
      console.error('Failed to load sales history:', err);
    }
  }, [school]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const filteredSales = sales.filter((s) => {
    const matchSearch =
      s.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleViewDetail = async (sale: Sale) => {
    setSelectedSale(sale);
    const items = await saleRepo.getItems(sale.id);
    setSaleItems(items);
  };

  const handleOpenVoidModal = (sale: Sale) => {
    setSelectedSale(sale);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const handleExecuteVoid = async () => {
    if (!school || !currentUser || !selectedSale) return;
    if (!voidReason.trim()) {
      notify('Alasan pembatalan (void) wajib diisi.', 'error');
      return;
    }

    setIsVoiding(true);
    try {
      await voidSale({
        school_id: school.id,
        sale_id: selectedSale.id,
        void_reason: voidReason.trim(),
        user_id: currentUser.id,
        user_name: currentUser.full_name,
      });

      setShowVoidModal(false);
      setSelectedSale(null);
      await loadSales();
      await refreshContext();
      notify(`Transaksi ${selectedSale.sale_number} berhasil dibatalkan dan stok dikembalikan.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membatalkan transaksi';
      notify(msg, 'error');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Riwayat Transaksi Penjualan</h2>
          <p className="text-xs text-slate-500">
            Daftar lengkap struk kasir, status pembayaran, audit trail dan fitur pembatalan (void)
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari no. struk / kasir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'Dibayar' | 'Dibatalkan')}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="Dibayar">Dibayar</option>
            <option value="Dibatalkan">Dibatalkan (Void)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">No. Transaksi</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-right">Estimasi Laba</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Tidak ada data transaksi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {sale.sale_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(sale.sale_date)}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{sale.user_name}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(sale.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">
                      {sale.status === 'Dibayar' ? formatCurrency(sale.profit_total) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          sale.status === 'Dibayar'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewDetail(sale)}
                          className="p-1 text-slate-600 hover:text-emerald-700 rounded hover:bg-slate-100"
                          title="Lihat Rincian Barang"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setReprintSale(sale)}
                          className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                          title="Cetak Struk"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {sale.status === 'Dibayar' && permissions.canVoid && (
                          <button
                            onClick={() => handleOpenVoidModal(sale)}
                            className="p-1 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50"
                            title="Batalkan Transaksi (Void)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Transaksi */}
      {selectedSale && !showVoidModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Rincian Transaksi Kasir</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedSale.sale_number}</p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-400">Kasir:</span>
                <p className="font-semibold text-slate-800">{selectedSale.user_name}</p>
              </div>
              <div>
                <span className="text-slate-400">Waktu:</span>
                <p className="font-semibold text-slate-800">{formatDate(selectedSale.sale_date)}</p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <p className="font-semibold text-slate-800">{selectedSale.status}</p>
              </div>
              <div>
                <span className="text-slate-400">Metode Bayar:</span>
                <p className="font-semibold text-slate-800">{selectedSale.payment_method}</p>
              </div>
            </div>

            {selectedSale.status === 'Dibatalkan' && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800">
                <strong>Alasan Pembatalan (Void):</strong> {selectedSale.notes || 'Tidak dicatat'}
              </div>
            )}

            {/* Item List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-xl p-2 text-xs">
              {saleItems.map((item) => (
                <div key={item.id} className="py-2 flex justify-between">
                  <div>
                    <div className="font-bold text-slate-800">{item.product_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.qty} {item.unit_name} x {formatCurrency(item.unit_price)}
                    </div>
                    {item.batch_allocations && item.batch_allocations.length > 0 && (
                      <div className="text-[10px] text-emerald-700">
                        Batch: {item.batch_allocations.map((b) => `${b.batch_number} (${b.qty})`).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(item.subtotal)}</div>
                    <div className="text-[10px] text-slate-400">HPP: {formatCurrency(item.cogs_amount)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial breakdown */}
            <div className="space-y-1 text-xs text-right border-t pt-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.total_amount)}</span>
              </div>
              {selectedSale.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon:</span>
                  <span>-{formatCurrency(selectedSale.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t pt-1">
                <span>Total:</span>
                <span>{formatCurrency(selectedSale.grand_total)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Total Laba Kotor:</span>
                <span>{formatCurrency(selectedSale.profit_total)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pembatalan (Void) */}
      {showVoidModal && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Konfirmasi Pembatalan (Void)</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan membatalkan transaksi <strong>{selectedSale.sale_number}</strong> sebesar{' '}
              <strong>{formatCurrency(selectedSale.grand_total)}</strong>.<br />
              Tindakan ini akan secara otomatis:
              <br />• Mengembalikan seluruh kuantitas barang ke stok batch.
              <br />• Mengurangi pencatatan saldo kas transaksi.
              <br />• Mencatat log pembatalan ke Audit Trail permanen.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Alasan Pembatalan (Wajib):
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Pembeli keliru memilih varian / salah input nominal kasir..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowVoidModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Kembali
              </button>
              <button
                disabled={!voidReason.trim() || isVoiding}
                onClick={handleExecuteVoid}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-sm"
              >
                {isVoiding ? 'Membatalkan...' : 'Batalkan Transaksi (Void)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Ulang Struk */}
      {reprintSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-sm text-slate-900">Salinan Struk Transaksi</span>
              <button onClick={() => setReprintSale(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 space-y-2 leading-tight">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-xs">SALINAN STRUK</p>
                <p className="text-[10px] text-slate-600">{school?.school_name}</p>
              </div>

              <div className="text-[10px] space-y-0.5 pt-1">
                <div className="flex justify-between">
                  <span>No: {reprintSale.sale_number}</span>
                  <span>{formatDate(reprintSale.sale_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir: {reprintSale.user_name}</span>
                  <span>Status: {reprintSale.status}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                {reprintSale.items.map((it) => (
                  <div key={it.id}>
                    <div>{it.product_name}</div>
                    <div className="flex justify-between text-slate-600">
                      <span>{it.qty} x {formatCurrency(it.unit_price)}</span>
                      <span>{formatCurrency(it.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 font-semibold text-right">
                <div className="flex justify-between text-xs font-bold border-t border-slate-300 pt-1">
                  <span>Total:</span>
                  <span>{formatCurrency(reprintSale.grand_total)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tunai:</span>
                  <span>{formatCurrency(reprintSale.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Kembalian:</span>
                  <span>{formatCurrency(reprintSale.change_amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak</span>
              </button>
              <button
                onClick={() => setReprintSale(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
