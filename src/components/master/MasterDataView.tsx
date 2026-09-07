import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Plus,
  Search,
  Edit2,
  Trash2,
  Boxes,
  FolderTree,
  Ruler,
  Users,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { productRepo, categoryRepo, unitRepo, supplierRepo } from '../../repositories';
import { Product, Category, Unit, Supplier } from '../../domain/types';
import { formatCurrency } from '../../utils/formatters';

export const MasterDataView: React.FC = () => {
  const { school, currentUser, refreshContext, notify } = useApp();

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CATEGORIES' | 'UNITS' | 'SUPPLIERS'>('PRODUCTS');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    code: '',
    name: '',
    category_id: '',
    unit_id: '',
    cost_price: 0,
    selling_price: 0,
    min_stock: 5,
    barcode: '',
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ code: '', name: '', sort_order: 1 });

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supForm, setSupForm] = useState({ name: '', contact_person: '', phone: '', address: '' });

  const loadData = useCallback(async () => {
    if (!school) return;
    try {
      const [pList, cList, uList, sList] = await Promise.all([
        productRepo.getAll(school.id),
        categoryRepo.getAll(school.id),
        unitRepo.getAll(school.id),
        supplierRepo.getAll(school.id),
      ]);
      setProducts(pList);
      setCategories(cList);
      setUnits(uList);
      setSuppliers(sList);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  }, [school]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Save Product
  const handleSaveProduct = async () => {
    if (!school) return;
    if (!prodForm.name.trim() || !prodForm.code.trim()) {
      notify('Kode dan nama barang wajib diisi.', 'error');
      return;
    }

    try {
      const now = new Date().toISOString();
      const product: Product = {
        id: editingProduct ? editingProduct.id : 'prd_' + Date.now(),
        school_id: school.id,
        code: prodForm.code.trim().toUpperCase(),
        name: prodForm.name.trim(),
        category_id: prodForm.category_id || (categories[0]?.id ?? ''),
        unit_id: prodForm.unit_id || (units[0]?.id ?? ''),
        cost_price: prodForm.cost_price,
        selling_price: prodForm.selling_price,
        min_stock: prodForm.min_stock,
        total_stock: editingProduct ? editingProduct.total_stock : 0,
        has_expiry: false,
        barcode: prodForm.barcode || '',
        status: 'Active',
        created_at: editingProduct ? editingProduct.created_at : now,
        updated_at: now,
      };

      await productRepo.save(product);
      setShowProductModal(false);
      setEditingProduct(null);
      await loadData();
      await refreshContext();
      notify('Data barang berhasil disimpan.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan barang';
      notify(msg, 'error');
    }
  };

  // Handle Save Category
  const handleSaveCategory = async () => {
    if (!school) return;
    if (!catForm.name.trim() || !catForm.code.trim()) {
      notify('Kode dan nama kategori wajib diisi.', 'error');
      return;
    }

    try {
      const now = new Date().toISOString();
      const category: Category = {
        id: editingCategory ? editingCategory.id : 'cat_' + Date.now(),
        school_id: school.id,
        code: catForm.code.trim().toUpperCase(),
        name: catForm.name.trim(),
        sort_order: catForm.sort_order,
        status: 'Active',
        created_at: editingCategory ? editingCategory.created_at : now,
      };

      await categoryRepo.save(category);
      setShowCategoryModal(false);
      setEditingCategory(null);
      await loadData();
      notify('Kategori berhasil disimpan.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan kategori';
      notify(msg, 'error');
    }
  };

  // Handle Save Supplier
  const handleSaveSupplier = async () => {
    if (!school) return;
    if (!supForm.name.trim()) {
      notify('Nama supplier wajib diisi.', 'error');
      return;
    }

    try {
      const now = new Date().toISOString();
      const supplier: Supplier = {
        id: editingSupplier ? editingSupplier.id : 'sup_' + Date.now(),
        school_id: school.id,
        code: 'SUP-' + Date.now().toString().slice(-4),
        name: supForm.name.trim(),
        contact_person: supForm.contact_person.trim(),
        phone: supForm.phone.trim(),
        address: supForm.address.trim(),
        total_debt: editingSupplier ? (editingSupplier.total_debt || 0) : 0,
        current_debt: editingSupplier ? (editingSupplier.current_debt || 0) : 0,
        status: 'Active',
        created_at: editingSupplier ? editingSupplier.created_at : now,
      };

      await supplierRepo.save(supplier);
      setShowSupplierModal(false);
      setEditingSupplier(null);
      await loadData();
      notify('Data supplier berhasil disimpan.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan supplier';
      notify(msg, 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Master Data Koperasi</h2>
          <p className="text-xs text-slate-500">
            Katalog barang, kategori, satuan ukuran, dan data supplier rekanan
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold text-slate-700">
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'PRODUCTS' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Barang</span>
          </button>
          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'CATEGORIES' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Kategori</span>
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'SUPPLIERS' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Supplier</span>
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        {activeTab === 'PRODUCTS' && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setProdForm({
                code: 'BRG-' + String(products.length + 1).padStart(3, '0'),
                name: '',
                category_id: categories[0]?.id || '',
                unit_id: units[0]?.id || '',
                cost_price: 1000,
                selling_price: 2000,
                min_stock: 5,
                barcode: '',
              });
              setShowProductModal(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang</span>
          </button>
        )}

        {activeTab === 'CATEGORIES' && (
          <button
            onClick={() => {
              setEditingCategory(null);
              setCatForm({ code: 'KAT-' + String(categories.length + 1), name: '', sort_order: categories.length + 1 });
              setShowCategoryModal(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori</span>
          </button>
        )}

        {activeTab === 'SUPPLIERS' && (
          <button
            onClick={() => {
              setEditingSupplier(null);
              setSupForm({ name: '', contact_person: '', phone: '', address: '' });
              setShowSupplierModal(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Supplier</span>
          </button>
        )}
      </div>

      {/* Tab 1: Products */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Harga Beli</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-center">Stok Fisik</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products
                  .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.includes(searchQuery))
                  .map((p) => {
                    const cat = categories.find((c) => c.id === p.category_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">{p.code}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-3 px-4 text-slate-600">{cat?.name || '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(p.cost_price || 0)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(p.selling_price)}</td>
                        <td className="py-3 px-4 text-center font-bold">{p.total_stock}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setProdForm({
                                code: p.code,
                                name: p.name,
                                category_id: p.category_id,
                                unit_id: p.unit_id,
                                cost_price: p.cost_price || 0,
                                selling_price: p.selling_price,
                                min_stock: p.min_stock,
                                barcode: p.barcode || '',
                              });
                              setShowProductModal(true);
                            }}
                            className="p-1 text-slate-600 hover:text-emerald-700 rounded hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Categories */}
      {activeTab === 'CATEGORIES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Kategori</th>
                  <th className="py-3 px-4 text-center">Urutan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{c.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{c.sort_order}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditingCategory(c);
                          setCatForm({ code: c.code, name: c.name, sort_order: c.sort_order });
                          setShowCategoryModal(true);
                        }}
                        className="p-1 text-slate-600 hover:text-emerald-700 rounded hover:bg-slate-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Suppliers */}
      {activeTab === 'SUPPLIERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Supplier</th>
                  <th className="py-3 px-4">Kontak Person</th>
                  <th className="py-3 px-4">Telepon / HP</th>
                  <th className="py-3 px-4 text-right">Saldo Hutang</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{s.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{s.name}</td>
                    <td className="py-3 px-4 text-slate-600">{s.contact_person}</td>
                    <td className="py-3 px-4 text-slate-600">{s.phone}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">{formatCurrency(s.current_debt)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditingSupplier(s);
                          setSupForm({
                            name: s.name,
                            contact_person: s.contact_person,
                            phone: s.phone,
                            address: s.address,
                          });
                          setShowSupplierModal(true);
                        }}
                        className="p-1 text-slate-600 hover:text-emerald-700 rounded hover:bg-slate-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form Barang */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-sm text-slate-900">
                {editingProduct ? 'Edit Data Barang' : 'Tambah Barang Baru'}
              </span>
              <button onClick={() => setShowProductModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Barang:</label>
                <input
                  type="text"
                  value={prodForm.code}
                  onChange={(e) => setProdForm({ ...prodForm, code: e.target.value })}
                  className="w-full p-2 border rounded-lg uppercase font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori:</label>
                <select
                  value={prodForm.category_id}
                  onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
                  className="w-full p-2 border rounded-lg font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Nama Barang:</label>
              <input
                type="text"
                placeholder="Contoh: Buku Tulis Sinar Dunia 38 Lembar"
                value={prodForm.name}
                onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Harga Beli Standar (Rp):</label>
                <input
                  type="number"
                  min="0"
                  value={prodForm.cost_price}
                  onChange={(e) => setProdForm({ ...prodForm, cost_price: Number(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg text-right font-semibold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Harga Jual Kasir (Rp):</label>
                <input
                  type="number"
                  min="0"
                  value={prodForm.selling_price}
                  onChange={(e) => setProdForm({ ...prodForm, selling_price: Number(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg text-right font-bold text-emerald-800"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Batas Stok Minimum:</label>
              <input
                type="number"
                min="0"
                value={prodForm.min_stock}
                onChange={(e) => setProdForm({ ...prodForm, min_stock: Number(e.target.value) || 0 })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowProductModal(false)}
                className="flex-1 py-2 text-xs font-semibold border rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveProduct}
                className="flex-1 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Kategori */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-sm text-slate-900">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </span>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Kategori:</label>
                <input
                  type="text"
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                  className="w-full p-2 border rounded-lg uppercase font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kategori:</label>
                <input
                  type="text"
                  placeholder="Contoh: Makanan Ringan"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-2 text-xs font-semibold border rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Supplier */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-sm text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
              </span>
              <button onClick={() => setShowSupplierModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Toko / Distributor:</label>
                <input
                  type="text"
                  placeholder="Contoh: PT Gramedia Asri Media"
                  value={supForm.name}
                  onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kontak Person / Sales:</label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. Haryanto"
                  value={supForm.contact_person}
                  onChange={(e) => setSupForm({ ...supForm, contact_person: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / Telepon:</label>
                <input
                  type="text"
                  placeholder="08123456789"
                  value={supForm.phone}
                  onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSupplierModal(false)}
                className="flex-1 py-2 text-xs font-semibold border rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSupplier}
                className="flex-1 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
