import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  Receipt,
  PiggyBank,
  Wallet,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Boxes,
  Truck,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getDashboardMetrics, DashboardMetrics } from '../../services/reportService';
import { getInventoryAlerts } from '../../services/inventoryService';
import { saleRepo } from '../../repositories';
import { Sale, Product } from '../../domain/types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TabType } from '../layout/AppShell';

export const DashboardView: React.FC<{ onNavigate: (tab: TabType) => void }> = ({ onNavigate }) => {
  const { school, cooperative, activeSession, currentUser } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockList, setLowStockList] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!school) return;
    setIsLoading(true);
    try {
      const data = await getDashboardMetrics(school.id);
      setMetrics(data);

      const sales = await saleRepo.getAll(school.id);
      setRecentSales(sales.slice(0, 5));

      const alerts = await getInventoryAlerts(school.id);
      setLowStockList(alerts.lowStockProducts.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [school]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-200 text-xs font-semibold mb-2">
            <span>Sistem Koperasi Offline-First</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Selamat Datang, {currentUser?.full_name}
          </h2>
          <p className="text-sm text-emerald-200 mt-1">
            {cooperative?.cooperative_name} • {school?.school_name}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm shadow-md transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka Kasir</span>
          </button>
          <button
            onClick={() => onNavigate('procurement')}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-3.5 py-2 rounded-xl text-sm transition"
          >
            <Truck className="w-4 h-4" />
            <span>Input Pembelian</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 rounded-xl transition"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Penjualan Hari Ini */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penjualan Hari Ini</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(metrics?.todaySalesTotal || 0)}
            </h3>
            <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              <span>{metrics?.todayTransactionCount || 0} transaksi berhasil</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Estimasi Laba Hari Ini */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laba Kotor Hari Ini</p>
            <h3 className="text-xl font-extrabold text-emerald-700 mt-1">
              {formatCurrency(metrics?.todayGrossProfit || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Dihitung otomatis via HPP</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>

        {/* Saldo Kas Aktif */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Kas di Laci</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(metrics?.currentCashBalance || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeSession ? (
                <span className="text-emerald-700 font-medium">● Sesi kas aktif</span>
              ) : (
                <span className="text-amber-700 font-medium">● Sesi kas belum buka</span>
              )}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Peringatan Stok & Kedaluwarsa */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peringatan Stok</p>
            <div className="flex items-center gap-3 mt-1">
              <div>
                <span className="text-xl font-extrabold text-rose-600">
                  {metrics?.lowStockCount || 0}
                </span>
                <span className="text-xs text-slate-500 ml-1">menipis</span>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="text-xl font-extrabold text-amber-600">
                  {metrics?.expiringCount || 0}
                </span>
                <span className="text-xs text-slate-500 ml-1">kedaluwarsa</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-emerald-700 font-medium hover:underline mt-1 block"
            >
              Lihat di Persediaan &rarr;
            </button>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Sales & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-700" />
              <span>Transaksi Penjualan Terkini</span>
            </h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Semua Riwayat</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada transaksi penjualan tercatat hari ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{sale.sale_number}</div>
                    <div className="text-slate-400 text-[11px] flex items-center gap-2">
                      <span>{formatDate(sale.sale_date)}</span>
                      <span>•</span>
                      <span>Kasir: {sale.user_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(sale.grand_total)}</div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        sale.status === 'Dibayar'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Warning Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-600" />
              <span>Barang Hampir Habis (Di Bawah Stok Minimum)</span>
            </h3>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Kelola Stok</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {lowStockList.length === 0 ? (
            <div className="text-center py-8 text-emerald-700/80 text-xs font-medium bg-emerald-50/50 rounded-xl">
              ✓ Seluruh persediaan barang saat ini dalam batas aman.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStockList.map((prd) => (
                <div key={prd.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{prd.name}</div>
                    <div className="text-slate-400 text-[11px]">
                      Kode: {prd.code} • Min. Stok: {prd.min_stock}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      Sisa: {prd.total_stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
