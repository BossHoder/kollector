/**
 * Network Status Hook
 *
 * Tracks network connectivity using @react-native-community/netinfo.
 * Returns current connection status for use in offline banner and API handling.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';

/**
 * @typedef {Object} NetworkStatus
 * @property {boolean} isConnected - Whether device has network connectivity
 * @property {boolean} isInternetReachable - Whether internet is reachable (more reliable)
 * @property {string | null} type - Connection type (wifi, cellular, etc.)
 * @property {boolean} isLoading - Whether status is still being determined
 */

/**
 * Hook to track network connectivity
 * @returns {NetworkStatus}
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState({
    isConnected: true,
    isInternetReachable: true,
    type: null,
    isLoading: true,
  });

  const checkNetwork = useCallback(async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setStatus({
        isConnected: networkState.isConnected ?? false,
        isInternetReachable: networkState.isInternetReachable ?? false,
        type: networkState.type ?? null,
        isLoading: false,
      });
    } catch (error) {
      console.warn('Failed to get network state:', error);
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkNetwork();

    // Poll for network changes (expo-network doesn't have event-based API)
    const interval = setInterval(checkNetwork, 3000);

    return () => clearInterval(interval);
  }, [checkNetwork]);

  return status;
}

/**
 * Hook that returns simple boolean for offline detection
 * @returns {boolean} True if offline
 */
export function useIsOffline() {
  const { isConnected, isInternetReachable, isLoading } = useNetworkStatus();
  
  // Assume online while loading
  if (isLoading) return false;
  
  // Offline if no connection OR internet not reachable
  return !isConnected || isInternetReachable === false;
}

export default useNetworkStatus;
