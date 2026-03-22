import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { flushMaintenanceQueue } from '../utils/offlineQueue';

export default function GamificationQueueBridge() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const wasOnlineRef = useRef(false);

  useEffect(() => {
    const isOnline = Boolean(isConnected) && isInternetReachable !== false;

    if (isOnline && !wasOnlineRef.current) {
      void flushMaintenanceQueue().catch(() => {});
    }

    wasOnlineRef.current = isOnline;
  }, [isConnected, isInternetReachable]);

  return null;
}
