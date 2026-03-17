import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient';
import { DEFAULT_CATEGORY_OPTIONS } from '../config/categories';

export function useAssetCategories() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORY_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/assets/categories');
      const nextCategories = Array.isArray(response) ? response : response?.data || [];
      setCategories(nextCategories.length > 0 ? nextCategories : DEFAULT_CATEGORY_OPTIONS);
      setError(null);
    } catch (nextError) {
      setError(nextError);
      setCategories((currentCategories) => (
        currentCategories.length > 0 ? currentCategories : DEFAULT_CATEGORY_OPTIONS
      ));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}

export default useAssetCategories;
