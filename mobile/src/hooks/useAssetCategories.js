import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient';

export function useAssetCategories() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/assets/categories');
      const nextCategories = Array.isArray(response) ? response : response?.data || [];
      setCategories(nextCategories);
      setError(null);
    } catch (nextError) {
      setError(nextError);
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
