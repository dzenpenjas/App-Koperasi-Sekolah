import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Boxes,
  Wallet,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { saleRepo, productRepo, stockRepo, cashRepo } from '../../repositories';
import { Sale, SaleItem, Product, ProductBatch, CashTransaction } from '../../domain/types';
import { getStockValuation } from '../../services/reportService';
import { formatCurrency, formatDateOnly, formatNumber } from '../../utils/formatters';

export const ReportsView: React.FC = () => {
  const { school } = useApp();

  const [dateRange, setDateRange] = useState<'TODAY' | '7DAYS' | 'MONTH' | 'ALL'>('ALL');
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [cashTxs, setCashTxs] = useState<CashTransaction[]>([]);
  const [valuation, setValuation] = useState<{ totalItems: number; totalQty: number; totalValuation: number }>({
    totalItems: 0,
    totalQty: 0,
    totalValuation: 0,
  });

  const loadData = useCallback(async () => {
    if (!school) return;
    try {
      const [sList, pList, bList, val] = await Promise.all([
        saleRepo.getAll(school.id),
        productRepo.getAll(school.id),
        stockRepo.getAllBatches(school.id),
        getStockValuation(school.id),
      ]);
      setSales(sList);
      setProducts(pList);
      setBatches(bList);
      setValuation(val);

      // Collect all sale items
      const allItems: SaleItem[] = [];
      for (const s of sList) {
        if (s.status === 'Dibayar') {
          const items = await saleRepo.getItems(s.id);
          allItems.push(...items);
        }
      }
      setSaleItems(allItems);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }, [school]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return sales.filter((s) => {
      if (s.status !== 'Dibayar') return false;
      const saleDateStr = s.sale_date.slice(0, 10);

      if (dateRange === 'TODAY') {
        return saleDateStr === todayStr;
      } else if (dateRange === '7DAYS') {
        const diff = (now.getTime() - new Date(s.sale_date).getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      } else if (dateRange === 'MONTH') {
        return saleDateStr.slice(0, 7) === todayStr.slice(0, 7);
      }
      return true;
    });
  }, [sales, dateRange]);

  // Report calculations
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);
  const totalCogs = filteredSales.reduce((sum, s) => sum + s.cogs_total, 0);
  const totalGrossProfit = filteredSales.reduce((sum, s) => sum + s.profit_total, 0);
  const totalTransactions = filteredSales.length;
  const avgBasketSize = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
  const profitMarginPercent = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Top Selling Items
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; code: string; qty: number; revenue: number }> = {};

    for (const item of saleItems) {
      // check if parent sale is in filteredSales
      const match = filteredSales.some((s) => s.id === item.sale_id);
      if (match) {
        if (!map[item.product_id]) {
          map[item.product_id] = {
            name: item.product_name,
            product_code: item.product_code,
            qty: 0,
            revenue: 0,
          } as unknown as { name: string; code: string; qty: number; revenue: number };
        }
        map[item.product_id].qty += item.qty;
        map[item.product_id].revenue += item.subtotal;
      }
    }

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [saleItems, filteredSales]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = ['No. Transaksi', 'Tanggal', 'Kasir', 'Total Belanja', 'HPP', 'Laba', 'Status'];
    const rows = filteredSales.map((s) => [
      s.sale_number,
      s.sale_date,
      s.user_name,
      s.grand_total,
      s.cogs_total,
      s.profit_total,
      s.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Penjualan_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Laporan Keuangan & Penjualan</h2>
          <p className="text-xs text-slate-500">
            Rekap laba kotor, valuasi aset stok, perputaran barang, dan arus kas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDateRange('TODAY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === 'TODAY' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDateRange('7DAYS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '7DAYS' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setDateRange('MONTH')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === 'MONTH' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setDateRange('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === 'ALL' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Omzet Penjualan</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-slate-500 mt-1">{totalTransactions} transaksi berhasil</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total HPP (Modal Barang)</span>
          <div className="text-2xl font-black text-slate-700 mt-1">{formatCurrency(totalCogs)}</div>
          <p className="text-xs text-slate-500 mt-1">Dihitung otomatis via FIFO</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Laba Kotor</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(totalGrossProfit)}</div>
          <p className="text-xs text-emerald-800 font-semibold mt-1">Margin: {profitMarginPercent}%</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Valuasi Stok Persediaan</span>
          <div className="text-2xl font-black text-blue-800 mt-1">{formatCurrency(valuation.totalValuation)}</div>
          <p className="text-xs text-slate-500 mt-1">{valuation.totalQty} unit fisik di gudang</p>
        </div>
      </div>

      {/* Two Column Layout: Top Selling & Valuation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <span>Produk Terlaris (Berdasarkan Qty)</span>
            </h3>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada data barang terjual pada periode ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-400">Total Terjual: {p.qty} item</div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-slate-900">
                    {formatCurrency(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Persediaan & Aset */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-700" />
              <span>Ringkasan Nilai Aset Stok</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-500">Jumlah Jenis Barang Aktif</span>
              <div className="text-xl font-bold text-slate-800 mt-1">{valuation.totalItems} Barang</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-500">Total Kuantitas Fisik</span>
              <div className="text-xl font-bold text-slate-800 mt-1">{valuation.totalQty} Unit/Pcs</div>
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs space-y-1">
            <div className="flex justify-between font-bold text-emerald-900">
              <span>Total Nilai Aset Modal Barang:</span>
              <span className="text-base">{formatCurrency(valuation.totalValuation)}</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Nilai dihitung berdasarkan sisa kuantitas pada masing-masing batch dikali harga beli faktur (HPP).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
