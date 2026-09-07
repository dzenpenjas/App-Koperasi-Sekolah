import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicatorBadge: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isOnline
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-800 animate-pulse'
      }`}
      title={isOnline ? 'Terhubung online' : 'Mode Offline First aktif (IndexedDB lokal)'}
    >
      {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
      <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline First'}</span>
    </div>
  );
};
