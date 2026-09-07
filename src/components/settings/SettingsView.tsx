import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings,
  School as SchoolIcon,
  Sliders,
  HardDriveDownload,
  HardDriveUpload,
  ShieldAlert,
  Save,
  CheckCircle2,
  RefreshCw,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { settingsRepo, userRepo } from '../../repositories';
import { School, Cooperative, AppSettings, AuditLog } from '../../domain/types';
import { createFullBackup, restoreFromBackup } from '../../services/backupService';
import { getAuditLogs } from '../../services/auditService';
import { formatDate } from '../../utils/formatters';

export const SettingsView: React.FC = () => {
  const { school, cooperative, settings, currentUser, permissions, refreshContext, notify } = useApp();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'HPP' | 'BACKUP' | 'AUDIT'>('PROFILE');

  // Form states
  const [schoolName, setSchoolName] = useState('');
  const [npsn, setNpsn] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [coopName, setCoopName] = useState('');
  const [coopAddress, setCoopAddress] = useState('');
  const [coopPhone, setCoopPhone] = useState('');

  // HPP & Receipt settings
  const [hppMethod, setHppMethod] = useState<'FIFO' | 'AVERAGE'>('FIFO');
  const [receiptFooter, setReceiptFooter] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Restore file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = useCallback(async () => {
    if (!school) return;
    try {
      setSchoolName(school.school_name);
      setNpsn(school.npsn || '');
      setPrincipalName(school.principal_name || '');
      setCoopName(cooperative?.cooperative_name || '');
      setCoopAddress(school.address || '');
      setCoopPhone(school.phone || '');

      if (settings) {
        setHppMethod(settings.hpp_method);
        setReceiptFooter(settings.receipt_footer || '');
      }

      const logs = await getAuditLogs(school.id);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, [school, cooperative, settings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async () => {
    if (!school || !currentUser) return;
    setIsProcessing(true);
    try {
      const updatedSchool: School = {
        ...school,
        school_name: schoolName.trim(),
        npsn: npsn.trim(),
        principal_name: principalName.trim(),
        address: coopAddress.trim(),
        phone: coopPhone.trim(),
        updated_at: new Date().toISOString(),
      };
      await settingsRepo.saveSchool(updatedSchool);

      if (cooperative) {
        const updatedCoop: Cooperative = {
          ...cooperative,
          cooperative_name: coopName.trim(),
          updated_at: new Date().toISOString(),
        };
        await settingsRepo.saveCooperative(updatedCoop);
      }

      await refreshContext();
      notify('Profil sekolah dan koperasi berhasil diperbarui.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui profil';
      notify(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!school || !settings) return;
    setIsProcessing(true);
    try {
      const updatedSettings: AppSettings = {
        ...settings,
        hpp_method: hppMethod,
        receipt_footer: receiptFooter,
      };
      await settingsRepo.saveSettings(updatedSettings);
      await refreshContext();
      notify('Pengaturan sistem dan HPP berhasil disimpan.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan';
      notify(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadBackup = async () => {
    if (!school || !currentUser) return;
    try {
      const jsonString = await createFullBackup(school.id, currentUser.id, currentUser.full_name);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_KopSek_${school.school_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify('Cadangan database berhasil diunduh.', 'success');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunduh backup';
      notify(msg, 'error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !school || !currentUser) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (window.confirm('PERINGATAN: Memulihkan cadangan akan menggantikan seluruh database lokal saat ini. Lanjutkan?')) {
        setIsProcessing(true);
        try {
          const res = await restoreFromBackup(content, school.id, currentUser.id, currentUser.full_name);
          if (res.success) {
            notify(res.message, 'success');
            await refreshContext();
            await loadData();
          } else {
            notify(res.message, 'error');
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Gagal restore data';
          notify(msg, 'error');
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pengaturan Sistem & Database</h2>
          <p className="text-xs text-slate-500">
            Identitas sekolah, metode akuntansi HPP, backup & restore offline, dan log audit
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold text-slate-700">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'PROFILE' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <SchoolIcon className="w-3.5 h-3.5" />
            <span>Profil Sekolah</span>
          </button>
          <button
            onClick={() => setActiveTab('HPP')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'HPP' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Metode HPP</span>
          </button>
          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'BACKUP' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <HardDriveDownload className="w-3.5 h-3.5" />
            <span>Backup & Restore</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'AUDIT' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Profil Sekolah */}
      {activeTab === 'PROFILE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 max-w-2xl">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Profil Koperasi & Sekolah</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Koperasi:</label>
              <input
                type="text"
                value={coopName}
                onChange={(e) => setCoopName(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Sekolah Asosiasi:</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">NPSN Sekolah:</label>
              <input
                type="text"
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kepala Sekolah / Penanggung Jawab:</label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Alamat Sekolah:</label>
              <input
                type="text"
                value={coopAddress}
                onChange={(e) => setCoopAddress(e.target.value)}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              disabled={isProcessing}
              onClick={handleSaveProfile}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: HPP & Konfigurasi */}
      {activeTab === 'HPP' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 max-w-2xl">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Metode Akuntansi & Format Struk</h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-800 block mb-2">Metode Penilaian HPP Persediaan:</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setHppMethod('FIFO')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition ${
                    hppMethod === 'FIFO'
                      ? 'border-emerald-600 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-900 block">FIFO (First-In, First-Out)</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Stok batch yang dibeli lebih awal akan dihitung dan dikeluarkan lebih dulu. Direkomendasikan untuk barang konsumsi/berkedaluwarsa.
                  </span>
                </div>

                <div
                  onClick={() => setHppMethod('AVERAGE')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition ${
                    hppMethod === 'AVERAGE'
                      ? 'border-emerald-600 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-900 block">Average Cost (Rata-rata Bergerak)</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    HPP dihitung berdasarkan rata-rata tertimbang harga beli seluruh batch aktif.
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Catatan Kaki Struk (Receipt Footer):</label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Terima kasih atas kunjungan Anda!"
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              disabled={isProcessing}
              onClick={handleSaveSettings}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Backup & Restore */}
      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          {/* Export / Backup */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-3">
                <HardDriveDownload className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Cadangkan Data (Backup JSON)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Unduh seluruh data IndexedDB lokal (transaksi, produk, supplier, batch, audit trail, kas) ke dalam file format JSON terstruktur yang aman.
              </p>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>Unduh File Cadangan (.json)</span>
            </button>
          </div>

          {/* Import / Restore */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-3">
                <HardDriveUpload className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Pulihkan Data (Restore JSON)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pilih file JSON cadangan yang telah diunduh sebelumnya untuk mengembalikan seluruh catatan sistem ke IndexedDB browser ini.
              </p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition"
              >
                <HardDriveUpload className="w-4 h-4" />
                <span>{isProcessing ? 'Memulihkan...' : 'Pilih File Cadangan...'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Log Audit Aktivitas Pengguna (Append-Only)</h4>
              <p className="text-xs text-slate-500">
                Pencatatan transparan seluruh mutasi penjualan, pembelian, opname stok, void, dan login
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-lg text-slate-700">
              Total: {auditLogs.length} Log
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Pengguna</th>
                  <th className="py-2.5 px-4">Modul</th>
                  <th className="py-2.5 px-4">Aktivitas</th>
                  <th className="py-2.5 px-4">Detail Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      Belum ada catatan log aktivitas.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{log.user_name}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                          {log.module}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{log.action}</td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                        {log.new_value || log.old_value || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
