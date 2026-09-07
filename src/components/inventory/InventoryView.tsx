import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Layers,
  Search,
  AlertTriangle,
  SlidersHorizontal,
  History,
  CheckCircle2,
  Calendar,
  X,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { productRepo, stockRepo } from '../../repositories';
import { Product, ProductBatch, StockMovement } from '../../domain/types';
import { adjustStock, markDamagedOrExpired, getInventoryAlerts } from '../../services/inventoryService';
import { formatCurrency, formatDate, formatDateOnly } from '../../utils/formatters';

export const InventoryView: React.FC = () => {
  const { school, currentUser, permissions, refreshContext, notify } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'STOCK' | 'BATCHES' | 'MOVEMENTS'>('STOCK');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [adjustingBatch, setAdjustingBatch] = useState<ProductBatch | null>(null);
  const [adjustNewQty, setAdjustNewQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  const [damageBatch, setDamageBatch] = useState<ProductBatch | null>(null);
  const [damageQty, setDamageQty] = useState<number>(1);
  const [damageType, setDamageType] = useState<'DAMAGE' | 'EXPIRED'>('DAMAGE');
  const [damageReason, setDamageReason] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!school) return;
    try {
      const [pList, bList, mList] = await Promise.all([
        productRepo.getAll(school.id),
        stockRepo.getAllBatches(school.id),
        stockRepo.getAllMovements(school.id),
      ]);
      setProducts(pList);
      setBatches(bList);
      setMovements(mList);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    }
  }, [school]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBatches = batches.filter((b) => {
    const prd = products.find((p) => p.id === b.product_id);
    const prdName = prd ? prd.name.toLowerCase() : '';
    return (
      b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prdName.includes(searchQuery.toLowerCase())
    );
  });

  const handleExecuteAdjustment = async () => {
    if (!school || !currentUser || !adjustingBatch) return;
    if (!adjustReason.trim()) {
      notify('Alasan penyesuaian stok wajib diisi.', 'error');
      return;
    }

    try {
      await adjustStock({
        school_id: school.id,
        product_id: adjustingBatch.product_id,
        batch_id: adjustingBatch.id,
        new_qty: adjustNewQty,
        reason: adjustReason.trim(),
        user_id: currentUser.id,
        user_name: currentUser.full_name,
      });

      setAdjustingBatch(null);
      await loadData();
      await refreshContext();
      notify('Penyesuaian stok berhasil disimpan.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyesuaikan stok';
      notify(msg, 'error');
    }
  };

  const handleExecuteDamage = async () => {
    if (!school || !currentUser || !damageBatch) return;
    if (!damageReason.trim()) {
      notify('Alasan pencatatan barang rusak/kedaluwarsa wajib diisi.', 'error');
      return;
    }

    try {
      await markDamagedOrExpired({
        school_id: school.id,
        product_id: damageBatch.product_id,
        batch_id: damageBatch.id,
        qty: damageQty,
        type: damageType,
        reason: damageReason.trim(),
        user_id: currentUser.id,
        user_name: currentUser.full_name,
      });

      setDamageBatch(null);
      await loadData();
      await refreshContext();
      notify(`Pencatatan ${damageType === 'DAMAGE' ? 'barang rusak' : 'kedaluwarsa'} berhasil.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat';
      notify(msg, 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Persediaan & Kartu Stok</h2>
          <p className="text-xs text-slate-500">
            Monitoring stok multi-batch, alokasi FIFO, stok opname, dan riwayat mutasi
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold text-slate-700">
          <button
            onClick={() => setActiveSubTab('STOCK')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'STOCK' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Ringkasan Barang
          </button>
          <button
            onClick={() => setActiveSubTab('BATCHES')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'BATCHES' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Batch & Kedaluwarsa
          </button>
          <button
            onClick={() => setActiveSubTab('MOVEMENTS')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'MOVEMENTS' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Riwayat Mutasi Stok
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, kode barang, atau no. batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* SUB-TAB 1: PRODUCT STOCK SUMMARY */}
      {activeSubTab === 'STOCK' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-center">Stok Minimum</th>
                  <th className="py-3 px-4 text-center">Total Stok</th>
                  <th className="py-3 px-4 text-center">Status Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.total_stock <= p.min_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{p.code}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{p.name}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(p.selling_price)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">{p.min_stock}</td>
                      <td className="py-3 px-4 text-center font-extrabold text-sm">
                        <span className={isLow ? 'text-rose-600' : 'text-slate-800'}>
                          {p.total_stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.total_stock === 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.total_stock === 0 ? 'Habis' : isLow ? 'Menipis' : 'Aman'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BATCHES & EXPIRY */}
      {activeSubTab === 'BATCHES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">No. Batch</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4 text-right">Harga Beli (HPP)</th>
                  <th className="py-3 px-4 text-center">Sisa / Awal</th>
                  <th className="py-3 px-4 text-center">Kedaluwarsa</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi Opname</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map((b) => {
                  const prd = products.find((p) => p.id === b.product_id);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {b.batch_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{prd?.name || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(b.purchase_price)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-900">
                        {b.remaining_qty} / {b.initial_qty}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">
                        {formatDateOnly(b.expiry_date)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {permissions.canAdjustStock && (
                            <button
                              onClick={() => {
                                setAdjustingBatch(b);
                                setAdjustNewQty(b.remaining_qty);
                                setAdjustReason('');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                              title="Sesuaikan Stok"
                            >
                              Opname
                            </button>
                          )}
                          {b.remaining_qty > 0 && (
                            <button
                              onClick={() => {
                                setDamageBatch(b);
                                setDamageQty(1);
                                setDamageType('DAMAGE');
                                setDamageReason('');
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-medium"
                              title="Catat Rusak / Basi"
                            >
                              Rusak/Basi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STOCK MOVEMENTS AUDIT */}
      {activeSubTab === 'MOVEMENTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4 text-center">Jenis Mutasi</th>
                  <th className="py-3 px-4 text-center">Perubahan Qty</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const prd = products.find((p) => p.id === m.product_id);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-500">{formatDate(m.created_at)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{prd?.name || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.movement_type === 'PURCHASE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.movement_type === 'SALE'
                              ? 'bg-blue-100 text-blue-800'
                              : m.movement_type === 'VOID'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={m.qty >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {m.qty >= 0 ? `+${m.qty}` : m.qty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{m.notes}</td>
                      <td className="py-3 px-4 text-slate-500">{m.user_name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Penyesuaian Stok (Opname) */}
      {adjustingBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-sm text-slate-900">Penyesuaian Stok (Opname)</span>
              <button onClick={() => setAdjustingBatch(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs bg-slate-50 p-3 rounded-xl space-y-1">
              <div>
                <strong>Batch:</strong> {adjustingBatch.batch_number}
              </div>
              <div>
                <strong>Stok Tercatat Saat Ini:</strong> {adjustingBatch.remaining_qty}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Stok Fisik Sebenarnya (Qty Baru):
              </label>
              <input
                type="number"
                min="0"
                value={adjustNewQty}
                onChange={(e) => setAdjustNewQty(Number(e.target.value) || 0)}
                className="w-full text-base font-bold px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Alasan Penyesuaian (Wajib):
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Hasil stok opname bulanan / selisih fisik..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAdjustingBatch(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteAdjustment}
                className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                Simpan Penyesuaian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Barang Rusak / Kedaluwarsa */}
      {damageBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-sm text-slate-900">Catat Barang Rusak / Kedaluwarsa</span>
              <button onClick={() => setDamageBatch(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Jenis Pencatatan:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDamageType('DAMAGE')}
                  className={`py-2 rounded-lg font-bold border transition ${
                    damageType === 'DAMAGE'
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Barang Rusak
                </button>
                <button
                  type="button"
                  onClick={() => setDamageType('EXPIRED')}
                  className={`py-2 rounded-lg font-bold border transition ${
                    damageType === 'EXPIRED'
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Kedaluwarsa
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Jumlah Barang Dikeluarkan (Maks {damageBatch.remaining_qty}):
              </label>
              <input
                type="number"
                min="1"
                max={damageBatch.remaining_qty}
                value={damageQty}
                onChange={(e) => setDamageQty(Number(e.target.value) || 1)}
                className="w-full text-base font-bold px-3 py-2 border rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Alasan / Kronologi (Wajib):
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Kemasan pecah saat penataan rak / tanggal kedaluwarsa terlewati..."
                value={damageReason}
                onChange={(e) => setDamageReason(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDamageBatch(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteDamage}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                Keluarkan dari Stok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
