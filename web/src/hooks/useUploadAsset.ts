/**
 * useUploadAsset hook
 *
 * TanStack Query mutation for uploading assets to analyze-queue
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface UploadAssetParams {
  file: File;
  category: string;
}

interface UploadAssetResponse {
  success: boolean;
  data: {
    assetId: string;
    jobId: string;
    status: 'processing';
    message: string;
  };
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, category }: UploadAssetParams) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', category);

      const response = await apiClient.upload<UploadAssetResponse>(
        '/api/assets/analyze-queue',
        formData
      );

      return response;
    },
    onSuccess: () => {
      // Invalidate assets cache to show new asset in list
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
