import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Boxes,
  Truck,
  Wallet,
  BarChart3,
  Database,
  Settings as SettingsIcon,
  Menu,
  X,
  UserCheck,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OfflineIndicatorBadge } from '../common/OfflineIndicator';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { formatCurrency } from '../../utils/formatters';

export type TabType =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'inventory'
  | 'procurement'
  | 'cash'
  | 'reports'
  | 'master'
  | 'settings';

interface AppShellProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentTab, onSelectTab, children }) => {
  const {
    school,
    cooperative,
    currentUser,
    permissions,
    allUsers,
    activeSession,
    switchUser,
    toasts,
    dismissToast,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems: { id: TabType; label: string; icon: React.ReactNode; visible: boolean; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'pos',
      label: 'Kasir (POS)',
      icon: <ShoppingCart className="w-4 h-4" />,
      visible: permissions.canSell,
      badge: activeSession ? 'Buka' : 'Kas Tutup',
    },
    {
      id: 'sales',
      label: 'Riwayat Transaksi',
      icon: <ReceiptText className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'inventory',
      label: 'Persediaan & Stok',
      icon: <Boxes className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'procurement',
      label: 'Pembelian (PO)',
      icon: <Truck className="w-4 h-4" />,
      visible: permissions.canPurchase,
    },
    {
      id: 'cash',
      label: 'Manajemen Kas',
      icon: <Wallet className="w-4 h-4" />,
      visible: permissions.canManageCash || currentUser?.role_name === 'Administrator' || currentUser?.role_name === 'Ketua',
    },
    {
      id: 'reports',
      label: 'Laporan & Laba',
      icon: <BarChart3 className="w-4 h-4" />,
      visible: permissions.canViewReports,
    },
    {
      id: 'master',
      label: 'Master Data',
      icon: <Database className="w-4 h-4" />,
      visible: permissions.canManageMaster || currentUser?.role_name === 'Administrator',
    },
    {
      id: 'settings',
      label: 'Pengaturan & Backup',
      icon: <SettingsIcon className="w-4 h-4" />,
      visible: permissions.canManageSettings || permissions.canBackupRestore || currentUser?.role_name === 'Administrator',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans antialiased">
      {/* Top Header */}
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-emerald-100 hover:bg-emerald-700 focus:outline-none"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 border border-emerald-500/50 flex items-center justify-center font-bold text-amber-300 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                  {cooperative?.cooperative_name || 'Koperasi Sekolah'}
                </h1>
                <p className="text-[11px] text-emerald-200 truncate max-w-[200px] sm:max-w-xs">
                  {school?.school_name || 'SD Negeri Mandiri 01'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Controls & User Profile Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <OfflineIndicatorBadge />
            <PWAInstallButton />

            {/* Active Cash Session Quick Pill */}
            {activeSession ? (
              <button
                onClick={() => onSelectTab('cash')}
                className="hidden md:flex items-center gap-1.5 bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-600/60 px-2.5 py-1 rounded-full text-xs text-emerald-100 transition"
                title="Sesi kas sedang aktif"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Kas: {formatCurrency(activeSession.expected_closing_cash)}</span>
              </button>
            ) : (
              <button
                onClick={() => onSelectTab('cash')}
                className="hidden md:flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 text-amber-200 px-2.5 py-1 rounded-full text-xs hover:bg-amber-500/30 transition"
              >
                <span>Kas Ditutup</span>
              </button>
            )}

            {/* User Account / Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 bg-emerald-900/80 hover:bg-emerald-900 border border-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition focus:outline-none"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-amber-200 font-bold flex items-center justify-center text-xs">
                  {currentUser?.full_name.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-xs leading-none">{currentUser?.full_name}</div>
                  <div className="text-[10px] text-emerald-300 capitalize">{currentUser?.role_name}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white text-slate-800 shadow-2xl border border-slate-200 py-2 z-50">
                  <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Pilih Role Pengguna</p>
                    <p className="text-xs text-slate-500">Beralih peran untuk menguji hak akses RBAC:</p>
                  </div>
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {allUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 transition ${
                          currentUser?.id === u.id ? 'bg-emerald-100/70 font-bold text-emerald-900' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{u.full_name}</div>
                          <div className="text-[11px] text-slate-500">{u.role_name}</div>
                        </div>
                        {currentUser?.id === u.id && <UserCheck className="w-4 h-4 text-emerald-700" />}
                      </button>
                    ))}
                  </div>
                  <div className="px-3.5 pt-2 pb-1 border-t border-slate-100 text-[11px] text-slate-400">
                    Sistem Offline-First IndexedDB
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Sidebar Navigation for Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 p-4 shrink-0">
          <div className="mb-3 px-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Menu Utama</span>
          </div>
          <nav className="space-y-1">
            {navItems
              .filter((item) => item.visible)
              .map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isActive
                            ? 'bg-emerald-800 text-emerald-100'
                            : item.badge === 'Buka'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full shadow-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-sm">Navigasi Koperasi</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1 mt-4 flex-1 overflow-y-auto">
                {navItems
                  .filter((item) => item.visible)
                  .map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                          isActive
                            ? 'bg-emerald-700 text-white font-semibold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              isActive ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </nav>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto">{children}</main>
      </div>

      {/* Global Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition max-w-sm ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-sky-400 shrink-0" />
            )}
            <span className="flex-1 text-xs leading-relaxed">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
