import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
        title="Pasang Aplikasi (PWA)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Install di iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-slate-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold">Pasang di iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                1. Buka di Safari, ketuk tombol <strong>Bagikan / Share</strong> di bilah bawah browser.<br />
                2. Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
