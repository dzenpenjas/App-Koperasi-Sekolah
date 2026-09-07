/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell, TabType } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { POSView } from './components/pos/POSView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { InventoryView } from './components/inventory/InventoryView';
import { ProcurementView } from './components/procurement/ProcurementView';
import { CashView } from './components/cash/CashView';
import { ReportsView } from './components/reports/ReportsView';
import { MasterDataView } from './components/master/MasterDataView';
import { SettingsView } from './components/settings/SettingsView';
import { ShieldCheck, Loader2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isLoading, school, cooperative } = useApp();
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="w-16 h-16 rounded-2xl bg-emerald-700 border border-emerald-500/50 flex items-center justify-center text-amber-300 shadow-xl mb-4 animate-pulse">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="flex items-center gap-2 font-bold text-lg text-emerald-100">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Memuat Basis Data IndexedDB Koperasi...</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Menyiapkan data offline-first sekolah</p>
      </div>
    );
  }

  return (
    <AppShell currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
      {currentTab === 'pos' && <POSView />}
      {currentTab === 'sales' && <SalesHistoryView />}
      {currentTab === 'inventory' && <InventoryView />}
      {currentTab === 'procurement' && <ProcurementView />}
      {currentTab === 'cash' && <CashView />}
      {currentTab === 'reports' && <ReportsView />}
      {currentTab === 'master' && <MasterDataView />}
      {currentTab === 'settings' && <SettingsView />}
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
