import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  X,
  AlertCircle,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { productRepo, categoryRepo } from '../../repositories';
import { Product, Category, Sale } from '../../domain/types';
import { CartItem, executeCheckout } from '../../services/posService';
import { openCashSession } from '../../services/cashService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const POSView: React.FC = () => {
  const { school, cooperative, currentUser, activeSession, refreshContext, notify } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Completed receipt modal state
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Open Cash Session Quick Modal
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [initialFloat, setInitialFloat] = useState(100000);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    if (!school) return;
    try {
      const [prodList, catList] = await Promise.all([
        productRepo.getAll(school.id),
        categoryRepo.getAll(school.id),
      ]);
      setProducts(prodList.filter((p) => p.status === 'Active'));
      setCategories(catList.filter((c) => c.status === 'Active'));
    } catch (err) {
      console.error('Failed to load POS data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [school]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  }, [cart]);

  const grandTotal = Math.max(0, cartSubtotal - discountAmount);
  const changeAmount = Math.max(0, paidAmount - grandTotal);

  const addToCart = (product: Product) => {
    if (product.total_stock <= 0) {
      notify(`Stok barang "${product.name}" habis.`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.total_stock) {
          notify(`Stok tidak mencukupi (Maks: ${product.total_stock})`, 'error');
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            product_code: product.code,
            product_name: product.name,
            unit_name: 'Pcs',
            unit_price: product.selling_price,
            qty: 1,
            available_stock: product.total_stock,
          },
        ];
      }
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.qty + delta;
            if (newQty > item.available_stock) {
              notify(`Stok tidak mencukupi (Maks: ${item.available_stock})`, 'error');
              return item;
            }
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setNotes('');
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setPaidAmount(grandTotal); // default to exact money
    setShowPaymentModal(true);
  };

  const handleProcessCheckout = async () => {
    if (!school || !currentUser) return;
    if (paidAmount < grandTotal) {
      notify('Uang pembayaran kurang dari total belanja!', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const sale = await executeCheckout({
        school_id: school.id,
        cart,
        discount_amount: discountAmount,
        paid_amount: paidAmount,
        notes,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
      });

      setCompletedSale(sale);
      setShowPaymentModal(false);
      clearCart();
      await loadData();
      await refreshContext();
      notify(`Transaksi ${sale.sale_number} berhasil diselesaikan!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyelesaikan transaksi';
      notify(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCashSession = async () => {
    if (!school || !currentUser) return;
    try {
      await openCashSession({
        school_id: school.id,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        initial_cash: initialFloat,
      });
      await refreshContext();
      setShowOpenSessionModal(false);
      notify('Sesi kas berhasil dibuka.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuka kas';
      notify(msg, 'error');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full">
      {/* Left Column: Product Search, Category Tabs, Grid */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Warning if no cash session */}
        {!activeSession && (
          <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Perhatian:</strong> Sesi kas saat ini belum dibuka. Anda dapat membuka sesi kas untuk mencatat saldo laci.
              </span>
            </div>
            <button
              onClick={() => setShowOpenSessionModal(true)}
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-3 py-1.5 rounded-lg shrink-0 transition"
            >
              Buka Sesi Kas
            </button>
          </div>
        )}

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari nama barang atau kode barang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
            />
          </div>
          <button
            onClick={loadData}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            title="Muat ulang barang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition ${
              selectedCategory === 'all'
                ? 'bg-emerald-700 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition ${
                selectedCategory === cat.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto pr-1">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.total_stock <= 0;
            return (
              <div
                key={product.id}
                onClick={() => !isOutOfStock && addToCart(product)}
                className={`bg-white rounded-xl p-3.5 border transition flex flex-col justify-between select-none ${
                  isOutOfStock
                    ? 'opacity-60 border-slate-200 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer active:scale-98'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{product.code}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        product.total_stock <= product.min_stock
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Stok: {product.total_stock}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-snug">
                    {product.name}
                  </h4>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-extrabold text-emerald-800 text-sm">
                    {formatCurrency(product.selling_price)}
                  </span>
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    +
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Order Cart Panel */}
      <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col h-full shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-700" />
            <span className="font-bold text-slate-900 text-base">Keranjang Kasir</span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[240px] max-h-[380px]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-6">
              <ShoppingCart className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
              <p className="font-medium">Keranjang masih kosong</p>
              <p className="text-[11px] mt-1 text-slate-400">Pilih barang di sebelah kiri untuk menambah ke transaksi</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product_id}
                className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="flex-1 pr-2">
                  <div className="font-semibold text-slate-800 line-clamp-1">{item.product_name}</div>
                  <div className="text-slate-500 text-[11px]">
                    {formatCurrency(item.unit_price)} x {item.qty} ={' '}
                    <strong className="text-slate-900 font-bold">{formatCurrency(item.qty * item.unit_price)}</strong>
                  </div>
                </div>

                {/* Qty Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQty(item.product_id, -1)}
                    className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-slate-800">{item.qty}</span>
                  <button
                    onClick={() => updateCartQty(item.product_id, 1)}
                    className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                    title="Hapus"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Calculations & Payment Button */}
        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal ({cart.reduce((a, b) => a + b.qty, 0)} barang)</span>
            <span className="font-semibold text-slate-800">{formatCurrency(cartSubtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Diskon Nota (Rp)</span>
            <input
              type="number"
              min="0"
              value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-24 px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-900 text-sm">Total Bayar</span>
            <span className="font-black text-emerald-800 text-lg sm:text-xl">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={handleOpenPayment}
            className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl shadow-md transition text-sm flex items-center justify-center gap-2"
          >
            <span>Bayar (F9 / Spasi)</span>
          </button>
        </div>
      </div>

      {/* Modal Pembayaran */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Pembayaran Tunai</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-center">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Tagihan</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
                {formatCurrency(grandTotal)}
              </div>
            </div>

            {/* Quick cash denomination buttons */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Pilihan Cepat Nominal:</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaidAmount(grandTotal)}
                  className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold"
                >
                  Uang Pas
                </button>
                {[10000, 20000, 50000, 100000, 200000].map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => setPaidAmount(nominal)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold"
                  >
                    {formatCurrency(nominal)}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual input */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Uang Diterima dari Pembeli (Rp):
              </label>
              <input
                type="number"
                min={grandTotal}
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                className="w-full text-lg font-bold text-slate-900 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Change Display */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center text-sm">
              <span className="font-semibold text-emerald-900">Uang Kembalian:</span>
              <span className="text-lg font-black text-emerald-800">
                {formatCurrency(changeAmount)}
              </span>
            </div>

            {/* Catatan Transaksi Opsional */}
            <div>
              <input
                type="text"
                placeholder="Catatan transaksi (opsional, misal nama siswa/guru)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={paidAmount < grandTotal || isProcessing}
                onClick={handleProcessCheckout}
                className="flex-2 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs shadow-md transition"
              >
                {isProcessing ? 'Memproses...' : 'Selesaikan Transaksi & Cetak Struk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Struk Thermal Transaksi Selesai */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Transaksi Berhasil</span>
              </div>
              <button
                onClick={() => setCompletedSale(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Receipt Body */}
            <div
              id="printable-receipt"
              className="bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 space-y-2 leading-tight"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-xs">{cooperative?.cooperative_name}</p>
                <p className="text-[10px] text-slate-500">{school?.school_name}</p>
                <p className="text-[9px] text-slate-400">{school?.address}</p>
              </div>

              <div className="text-[10px] space-y-0.5 pt-1">
                <div className="flex justify-between">
                  <span>No: {completedSale.sale_number}</span>
                  <span>{formatDate(completedSale.sale_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir: {completedSale.user_name}</span>
                  <span>Metode: {completedSale.payment_method}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
                {completedSale.items.map((it) => (
                  <div key={it.id}>
                    <div className="font-bold">{it.product_name}</div>
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {it.qty} x {formatCurrency(it.unit_price)}
                      </span>
                      <span>{formatCurrency(it.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-1 font-semibold text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(completedSale.total_amount)}</span>
                </div>
                {completedSale.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>-{formatCurrency(completedSale.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-extrabold border-t border-slate-300 pt-1">
                  <span>Total:</span>
                  <span>{formatCurrency(completedSale.grand_total)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tunai:</span>
                  <span>{formatCurrency(completedSale.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Kembalian:</span>
                  <span>{formatCurrency(completedSale.change_amount)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-slate-400 border-t border-dashed border-slate-300">
                Terima kasih atas kunjungan Anda!<br />
                Koperasi Sekolah Mandiri PWA
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Thermal</span>
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buka Kas Sederhana */}
      {showOpenSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Buka Sesi Kas Harian</h3>
            <p className="text-xs text-slate-500">
              Masukkan jumlah saldo kas fisik di laci saat ini sebagai modal awal transaksi:
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Modal Awal Kas (Rp):</label>
              <input
                type="number"
                min="0"
                value={initialFloat}
                onChange={(e) => setInitialFloat(Number(e.target.value) || 0)}
                className="w-full text-base font-bold px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowOpenSessionModal(false)}
                className="flex-1 py-2 text-xs font-semibold border rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleOpenCashSession}
                className="flex-1 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm"
              >
                Buka Kas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
