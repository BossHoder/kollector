/**
 * useAsset Hook
 *
 * Data fetching hook for a single asset.
 * Supports manual refetch and loading/error states.
 * Realtime updates will be wired in US4 via SocketContext.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAsset } from '../api/assetsApi';

/**
 * Hook to fetch and manage a single asset's data
 *
 * @param {string} assetId - The asset ID to fetch
 * @param {Object} options
 * @param {boolean} [options.enabled=true] - Whether to fetch on mount
 * @param {number} [options.pollInterval=0] - Polling interval in ms (0 = disabled)
 * @returns {Object} { asset, isLoading, error, refetch, updateAsset }
 */
export function useAsset(assetId, { enabled = true, pollInterval = 0 } = {}) {
  const [asset, setAsset] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  /**
   * Fetch or refresh asset data
   */
  const fetchAsset = useCallback(async () => {
    if (!assetId) {
      setIsLoading(false);
      setAsset(null);
      return;
    }

    try {
      const data = await getAsset(assetId);
      
      if (mountedRef.current) {
        setAsset(data);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [assetId]);

  /**
   * Refetch asset data (can be called externally)
   */
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchAsset();
  }, [fetchAsset]);

  /**
   * Update local asset state without fetching
   * Useful for optimistic UI updates or realtime events
   */
  const updateAsset = useCallback((updates) => {
    setAsset((prev) => {
      if (!prev) return null;
      
      // Support both partial updates and full replacement
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      if (!next) {
        return next;
      }

      return {
        ...next,
        updatedAt: next.updatedAt || prev.updatedAt || new Date().toISOString(),
      };
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && assetId) {
      fetchAsset();
    } else {
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [assetId, enabled, fetchAsset]);

  // Polling (for processing status without realtime)
  useEffect(() => {
    if (pollInterval > 0 && assetId && enabled) {
      pollRef.current = setInterval(() => {
        fetchAsset();
      }, pollInterval);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [pollInterval, assetId, enabled, fetchAsset]);

  return {
    asset,
    isLoading,
    error,
    refetch,
    updateAsset,
  };
}

export default useAsset;
