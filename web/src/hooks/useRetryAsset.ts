/**
 * useRetryAsset hook
 *
 * TanStack Query mutation for retrying failed asset analysis
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface RetryAssetResponse {
  success: boolean;
  data: {
    assetId: string;
    jobId: string;
    status: 'processing';
    message: string;
  };
}

export function useRetryAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const response = await apiClient.post<RetryAssetResponse>(
        `/api/assets/${assetId}/retry`
      );
      return response;
    },
    onSuccess: (_, assetId) => {
      // Invalidate the specific asset cache
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      // Also invalidate the assets list
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
