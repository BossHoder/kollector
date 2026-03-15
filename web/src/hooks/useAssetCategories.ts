import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AssetCategoryOption {
  value: string;
  label: string;
  allowCustomValue?: boolean;
}

interface AssetCategoryResponse {
  success?: boolean;
  data?: AssetCategoryOption[];
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const response = await apiClient.get<AssetCategoryResponse | AssetCategoryOption[]>(
        '/api/assets/categories'
      );

      return Array.isArray(response) ? response : response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
