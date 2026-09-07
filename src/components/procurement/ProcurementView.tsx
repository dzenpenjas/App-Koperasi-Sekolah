import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { purchaseRepo, supplierRepo, productRepo } from '../../repositories';
import { Purchase, PurchaseItem, Supplier, Product } from '../../domain/types';
import { createPurchase } from '../../services/procurementService';
import { formatCurrency, formatDate, formatDateOnly } from '../../utils/formatters';

export const ProcurementView: React.FC = () => {
  const { school, currentUser, refreshContext, notify } = useApp();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // New Purchase Form Modal
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic PO Items
  const [poItems, setPoItems] = useState<
    {
      product_id: string;
      product_code: string;
      product_name: string;
      qty: number;
      purchase_price: number;
      expiry_date?: string;
    }[]
  >([]);

  // Selected PO Detail Modal
  const [selectedPO, setSelectedPO] = useState<Purchase | null>(null);
  const [selectedPOItems, setSelectedPOItems] = useState<PurchaseItem[]>([]);

  const loadData = useCallback(async () => {
    if (!school) return;
    try {
      const [purList, supList, prodList] = await Promise.all([
        purchaseRepo.getAll(school.id),
        supplierRepo.getAll(school.id),
        productRepo.getAll(school.id),
      ]);
      setPurchases(purList);
      setSuppliers(supList.filter((s) => s.status === 'Active'));
      setProducts(prodList.filter((p) => p.status === 'Active'));
      if (supList.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(supList[0].id);
      }
    } catch (err) {
      console.error('Failed to load procurement data:', err);
    }
  }, [school, selectedSupplierId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchase_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItemToPO = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setPoItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        product_code: prod.code,
        product_name: prod.name,
        qty: 10,
        purchase_price: prod.cost_price || 1000,
        expiry_date: '',
      },
    ]);
  };

  const updatePoItem = (
    index: number,
    field: 'qty' | 'purchase_price' | 'expiry_date',
    value: unknown
  ) => {
    setPoItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removePoItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const poSubtotal = poItems.reduce((sum, item) => sum + item.qty * item.purchase_price, 0);
  const poGrandTotal = Math.max(0, poSubtotal - discountAmount + additionalFee);

  const handleSavePurchase = async (status: 'Draft' | 'Final') => {
    if (!school || !currentUser) return;
    if (poItems.length === 0) {
      notify('Tambahkan minimal 1 barang pada pesanan pembelian.', 'error');
      return;
    }
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) {
      notify('Pilih supplier terlebih dahulu.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const pur = await createPurchase({
        school_id: school.id,
        supplier_id: sup.id,
        supplier_name: sup.name,
        purchase_date: purchaseDate,
        items: poItems,
        discount_amount: discountAmount,
        additional_fee: additionalFee,
        paid_amount: paidAmount,
        notes,
        status,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
      });

      setShowNewPurchaseModal(false);
      setPoItems([]);
      setDiscountAmount(0);
      setAdditionalFee(0);
      setPaidAmount(0);
      setNotes('');
      await loadData();
      await refreshContext();
      notify(`Faktur pembelian ${pur.purchase_number} berhasil disimpan (${status}).`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pembelian';
      notify(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetail = async (po: Purchase) => {
    setSelectedPO(po);
    const items = await purchaseRepo.getItems(po.id);
    setSelectedPOItems(items);
  };

  return (
    <div className="space-y-5">
      {/* Header & New PO Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pengadaan & Pembelian (PO)</h2>
          <p className="text-xs text-slate-500">
            Pencatatan faktur supplier, pembuatan batch otomatis, dan pelacakan hutang usaha
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowNewPurchaseModal(true);
              if (poItems.length === 0 && products.length > 0) {
                handleAddItemToPO(products[0].id);
              }
            }}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Input Faktur Baru</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari no. PO atau nama supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">No. PO</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Total Faktur</th>
                <th className="py-3 px-4 text-right">Dibayar</th>
                <th className="py-3 px-4 text-center">Status PO</th>
                <th className="py-3 px-4 text-center">Pembayaran</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Belum ada data pengadaan barang tercatat.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {po.purchase_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDateOnly(po.purchase_date)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{po.supplier_name}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(po.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-medium">
                      {formatCurrency(po.paid_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          po.status === 'Final'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          po.payment_status === 'Lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.payment_status === 'Sebagian'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {po.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleViewDetail(po)}
                        className="p-1 text-slate-600 hover:text-emerald-700 rounded hover:bg-slate-100"
                        title="Lihat Detail Faktur"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Faktur Baru */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900">Input Faktur Pengadaan (PO)</h3>
              <button
                onClick={() => setShowNewPurchaseModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Supplier & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pilih Supplier:</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contact_person})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Faktur:</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800">Daftar Barang Masuk:</span>
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItemToPO(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      className="p-1.5 bg-emerald-50 text-emerald-800 font-semibold border border-emerald-300 rounded-lg text-xs"
                    >
                      <option value="" disabled>
                        + Tambah Barang...
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-2.5">Barang</th>
                        <th className="p-2.5 w-20 text-center">Jumlah</th>
                        <th className="p-2.5 w-28 text-right">Harga Beli</th>
                        <th className="p-2.5 w-28 text-center">Tgl Kadaluarsa</th>
                        <th className="p-2.5 w-28 text-right">Subtotal</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-slate-400">
                            Belum ada barang dipilih.
                          </td>
                        </tr>
                      ) : (
                        poItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-800">{item.product_name}</td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) =>
                                  updatePoItem(idx, 'qty', Number(e.target.value) || 1)
                                }
                                className="w-full text-center p-1 border rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                value={item.purchase_price}
                                onChange={(e) =>
                                  updatePoItem(idx, 'purchase_price', Number(e.target.value) || 0)
                                }
                                className="w-full text-right p-1 border rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={item.expiry_date || ''}
                                onChange={(e) =>
                                  updatePoItem(idx, 'expiry_date', e.target.value)
                                }
                                className="w-full p-1 border rounded text-[11px]"
                              />
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              {formatCurrency(item.qty * item.purchase_price)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => removePoItem(idx)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial calculations */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <label className="block text-slate-600 mb-1">Diskon Faktur (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border rounded text-right font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Ongkos Kirim / Biaya Tambahan (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={additionalFee || ''}
                    onChange={(e) => setAdditionalFee(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border rounded text-right font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Nominal Dibayar ke Supplier (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border rounded text-right font-bold text-emerald-800"
                  />
                </div>
                <div className="flex flex-col justify-center text-right pr-2">
                  <span className="text-slate-500 font-medium">Total Akhir Faktur:</span>
                  <span className="text-base font-black text-slate-900">{formatCurrency(poGrandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-3 border-t shrink-0">
              <button
                onClick={() => setShowNewPurchaseModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                disabled={isSubmitting || poItems.length === 0}
                onClick={() => handleSavePurchase('Draft')}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm"
              >
                Simpan Sebagai Draft
              </button>
              <button
                disabled={isSubmitting || poItems.length === 0}
                onClick={() => handleSavePurchase('Final')}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm"
              >
                {isSubmitting ? 'Menyimpan...' : 'Finalisasi & Masuk Stok'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail PO */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Rincian Faktur Pembelian</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedPO.purchase_number}</p>
              </div>
              <button onClick={() => setSelectedPO(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-400">Supplier:</span>
                <p className="font-bold text-slate-800">{selectedPO.supplier_name}</p>
              </div>
              <div>
                <span className="text-slate-400">Tanggal Faktur:</span>
                <p className="font-semibold text-slate-800">{formatDateOnly(selectedPO.purchase_date)}</p>
              </div>
              <div>
                <span className="text-slate-400">Status Faktur:</span>
                <p className="font-bold text-slate-800">{selectedPO.status}</p>
              </div>
              <div>
                <span className="text-slate-400">Status Pembayaran:</span>
                <p className="font-bold text-slate-800">{selectedPO.payment_status}</p>
              </div>
            </div>

            {/* Items */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-xl p-2 text-xs">
              {selectedPOItems.map((it) => (
                <div key={it.id} className="py-2 flex justify-between">
                  <div>
                    <div className="font-bold text-slate-800">{it.product_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {it.qty} Pcs x {formatCurrency(it.purchase_price)}
                    </div>
                    {it.expiry_date && (
                      <div className="text-[10px] text-amber-700">Exp: {formatDateOnly(it.expiry_date)}</div>
                    )}
                  </div>
                  <div className="text-right font-bold text-slate-900">
                    {formatCurrency(it.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs text-right border-t pt-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedPO.total_amount)}</span>
              </div>
              {selectedPO.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon:</span>
                  <span>-{formatCurrency(selectedPO.discount_amount)}</span>
                </div>
              )}
              {selectedPO.additional_fee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Tambahan:</span>
                  <span>+{formatCurrency(selectedPO.additional_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t pt-1">
                <span>Total Akhir:</span>
                <span>{formatCurrency(selectedPO.grand_total)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Jumlah Telah Dibayar:</span>
                <span>{formatCurrency(selectedPO.paid_amount)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPO(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
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
