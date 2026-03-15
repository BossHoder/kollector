/**
 * useUploadAsset hook
 *
 * TanStack Query mutation for uploading assets to analyze-queue
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiClient } from '@/lib/api-client';
import { normalizeCategory } from '@/lib/categoryNormalizer';

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

function buildCategoryCandidates(category: string): string[] {
  const normalizedInput = category.trim().toLowerCase();
  const canonical = normalizeCategory(normalizedInput);
  const candidates: string[] = [];

  if (normalizedInput) {
    candidates.push(normalizedInput);
  }

  if (canonical && !candidates.includes(canonical)) {
    candidates.push(canonical);
  }

  if (!candidates.includes('other')) {
    candidates.push('other');
  }

  return candidates;
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

function resolveAssetName(file: File, assetName: string): string {
  const normalized = assetName.trim().replace(/\.[^.]+$/, '');
  if (normalized) {
    return normalized;
  }

  const fromFilename = file.name.trim().replace(/\.[^.]+$/, '');
  return fromFilename || 'uploaded-asset';
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, category, assetName, runAi }: UploadAssetParams) => {
      const resolvedAssetName = resolveAssetName(file, assetName);
      const uploadFilename = `${resolvedAssetName}${resolveUploadExtension(file)}`;
      const categoryCandidates = buildCategoryCandidates(category);
      let lastCategoryError: ApiError | null = null;

      for (const requestCategory of categoryCandidates) {
        const formData = new FormData();
        formData.append('image', file, uploadFilename);
        formData.append('category', requestCategory);
        formData.append('assetName', resolvedAssetName);
        formData.append('runAi', String(runAi));

        try {
          const response = await apiClient.upload<UploadAssetResponse>(
            '/api/assets/analyze-queue',
            formData
          );
          return response;
        } catch (error) {
          const isInvalidCategoryError =
            error instanceof ApiError
            && error.status === 400
            && /category/i.test(error.message);

          if (isInvalidCategoryError) {
            lastCategoryError = error;
            continue;
          }

          throw error;
        }
      }

      if (lastCategoryError) {
        throw lastCategoryError;
      }

      throw new Error('Upload failed due to invalid category');
    },
    onSuccess: () => {
      // Invalidate assets cache to show new asset in list
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
    },
  });
}
