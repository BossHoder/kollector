/**
 * useAssets hook
 *
 * TanStack Query hook for fetching paginated assets
 * Supports filtering by category and status
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Asset, AssetCategory, AssetStatus } from '@/types/asset';
import type { ListAssetsParams, ListAssetsResponse } from '@/types/api';

const ASSETS_QUERY_KEY = 'assets';
const PAGE_SIZE = 12;

export interface UseAssetsParams {
  category?: AssetCategory;
  status?: AssetStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch paginated assets with filters
 */
export function useAssets(params: UseAssetsParams = {}) {
  const { category, status, search, page = 1, limit = PAGE_SIZE } = params;

  return useQuery({
    queryKey: [ASSETS_QUERY_KEY, { category, status, search, page, limit }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      queryParams.set('page', String(page));
      queryParams.set('limit', String(limit));
      
      if (category) queryParams.set('category', category);
      if (status) queryParams.set('status', status);
      if (search) queryParams.set('search', search);

      const url = `/api/assets?${queryParams.toString()}`;
      return apiClient.get<ListAssetsResponse>(url);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch assets with infinite scroll pagination
 */
export function useInfiniteAssets(params: Omit<UseAssetsParams, 'page'> = {}) {
  const { category, status, search, limit = PAGE_SIZE } = params;

  return useInfiniteQuery({
    queryKey: [ASSETS_QUERY_KEY, 'infinite', { category, status, search, limit }],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams();
      
      queryParams.set('page', String(pageParam));
      queryParams.set('limit', String(limit));
      
      if (category) queryParams.set('category', category);
      if (status) queryParams.set('status', status);
      if (search) queryParams.set('search', search);

      const url = `/api/assets?${queryParams.toString()}`;
      return apiClient.get<ListAssetsResponse>(url);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const assets = lastPage.assets ?? lastPage.items ?? [];
      const total = lastPage.total ?? 0;
      const loadedCount = allPages.reduce((acc, page) => acc + (page.assets ?? page.items ?? []).length, 0);
      if (total === 0 || loadedCount >= total) {
        return undefined;
      }
      return allPages.length + 1;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch single asset by ID
 */
export function useAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');
      return apiClient.get<Asset>(`/api/assets/${assetId}`);
    },
    enabled: !!assetId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to invalidate assets cache
 */
export function useInvalidateAssets() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_QUERY_KEY] });
    },
    invalidateOne: (assetId: string) => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
    },
  };
}
