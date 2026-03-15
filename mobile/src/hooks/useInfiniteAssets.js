/**
 * useInfiniteAssets Hook
 *
 * Infinite scroll hook for assets list with:
 * - Cursor-based pagination
 * - Status and category filtering
 * - Debounced search
 * - Pull-to-refresh
 * - Loading/error states
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { listAssets } from '../api/assetsApi';
import { usePendingUploadContext } from '../contexts/PendingUploadContext';

// Debounce delay for search input
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Debounce helper
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(prev => Object.is(prev, value) ? prev : value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * @typedef {Object} UseInfiniteAssetsOptions
 * @property {string} [status] - Filter by status
 * @property {string} [category] - Filter by category
 * @property {string} [search] - Search query
 * @property {number} [pageSize=20] - Results per page
 * @property {boolean} [enabled=true] - Enable/disable fetching
 */

/**
 * @typedef {Object} UseInfiniteAssetsResult
 * @property {Array} assets - Array of loaded assets
 * @property {boolean} isLoading - Initial loading state
 * @property {boolean} isLoadingMore - Loading more pages
 * @property {boolean} isRefreshing - Pull-to-refresh state
 * @property {Error|null} error - Error if fetch failed
 * @property {boolean} hasMore - More pages available
 * @property {Function} loadMore - Load next page
 * @property {Function} refresh - Refresh from start
 * @property {Function} updateAsset - Update a single asset in cache
 */

/**
 * Hook for fetching assets with infinite scroll
 *
 * @param {UseInfiniteAssetsOptions} options
 * @returns {UseInfiniteAssetsResult}
 */
export function useInfiniteAssets({
  status,
  category,
  search: rawSearch,
  pageSize = 20,
  enabled = true,
} = {}) {
  const { pendingUploads } = usePendingUploadContext();
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);
  const mountedRef = useRef(true);

  // Debounce search input
  const search = useDebounce(rawSearch, SEARCH_DEBOUNCE_MS);

  // Create stable filter key for dependency tracking
  const filterKey = useMemo(
    () => JSON.stringify({ status, category, search }),
    [status, category, search]
  );

  /**
   * Fetch a page of assets
   */
  const fetchPage = useCallback(async (cursor, isRefresh = false, isInitial = false) => {
    const fetchId = ++fetchIdRef.current;

    try {
      const result = await listAssets({
        limit: pageSize,
        cursor,
        status: status || undefined,
        category: category && category !== 'all' ? category : undefined,
        search: search || undefined,
      });

      // Ignore stale responses
      if (!mountedRef.current || fetchId !== fetchIdRef.current) {
        return;
      }

      if (isRefresh || !cursor) {
        // First page or refresh
        setAssets(result.assets);
      } else {
        // Append to existing, deduplicating by id to guard against cursor drift
        setAssets(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          return [...prev, ...result.assets.filter(a => !existingIds.has(a.id))];
        });
      }

      setNextCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
      setError(null);

      // Always end initial skeleton once any first-page response is applied.
      // This avoids a race where initial request becomes stale and a refresh wins.
      if (isInitial || !cursor) {
        setIsLoading(false);
      }
    } catch (err) {
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setError(err);
        if (isInitial || !cursor) {
          setIsLoading(false);
        }
      }
    }
  }, [pageSize, status, category, search]);

  /**
   * Initial fetch and refetch on filter changes
   */
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    mountedRef.current = true;
    setIsLoading(true);
    setAssets([]);
    setNextCursor(null);
    setHasMore(true);

    fetchPage(null, false, true);

    return () => {
      mountedRef.current = false;
    };
  }, [filterKey, enabled, fetchPage]);

  /**
   * Load more (next page)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor || isLoading || isRefreshing) {
      return;
    }

    setIsLoadingMore(true);
    try {
      await fetchPage(nextCursor);
    } finally {
      if (mountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [isLoadingMore, hasMore, nextCursor, isLoading, isRefreshing, fetchPage]);

  /**
   * Pull-to-refresh
   */
  const refresh = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setNextCursor(null);
    setHasMore(true);
    
    try {
      await fetchPage(null, true);
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing, fetchPage]);

  /**
   * Update a single asset in the cache (e.g., from realtime event)
   */
  const updateAsset = useCallback((assetId, updates) => {
    setAssets(prev =>
      prev.map(asset =>
        asset.id === assetId
          ? { ...asset, ...updates }
          : asset
      )
    );
  }, []);

  /**
   * Remove an asset from the cache
   */
  const removeAsset = useCallback((assetId) => {
    setAssets(prev => prev.filter(asset => asset.id !== assetId));
  }, []);

  return {
    assets: [...pendingUploads, ...assets],
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    loadMore,
    refresh,
    updateAsset,
    removeAsset,
  };
}

export default useInfiniteAssets;
