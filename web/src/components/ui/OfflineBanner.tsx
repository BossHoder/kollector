/**
 * OfflineBanner Component
 *
 * Displays a banner when the user is offline
 * Uses navigator.onLine and online/offline events
 */

import { useState, useEffect } from 'react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[100] bg-stitch-red text-white px-4 py-2 text-center text-sm font-medium"
    >
      <span className="material-symbols-outlined text-sm align-middle mr-2">
        wifi_off
      </span>
      Bạn đang ngoại tuyến. Một số tính năng có thể không khả dụng.
    </div>
  );
}

export default OfflineBanner;
