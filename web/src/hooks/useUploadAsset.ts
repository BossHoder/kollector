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
  assetName: string;
  runAi: boolean;
}

interface UploadAssetResponse {
  success: boolean;
  data: {
    assetId: string;
    jobId: string | null;
    status: 'processing' | 'active';
    message: string;
  };
}

function resolveUploadExtension(file: File): string {
  const extensionFromName = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
  if (extensionFromName) {
    return extensionFromName.toLowerCase();
  }

  if (file.type === 'image/png') return '.png';
  if (file.type === 'image/webp') return '.webp';
  if (file.type === 'image/gif') return '.gif';
  return '.jpg';
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, category, assetName, runAi }: UploadAssetParams) => {
      const uploadFilename = `${assetName.trim().replace(/\.[^.]+$/, '')}${resolveUploadExtension(file)}`;
      const formData = new FormData();
      formData.append('image', file, uploadFilename);
      formData.append('category', category);
      formData.append('assetName', assetName.trim());
      formData.append('runAi', String(runAi));

      const response = await apiClient.upload<UploadAssetResponse>(
        '/api/assets/analyze-queue',
        formData
      );

      return response;
    },
    onSuccess: () => {
      // Invalidate assets cache to show new asset in list
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
    },
  });
}
