import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient';
import { DEFAULT_CATEGORY_OPTIONS } from '../config/categories';

const CATEGORY_LABEL_MAP = {
  sneaker: 'Giày Sneaker',
  sneakers: 'Giày Sneaker',
  shoes: 'Giày Sneaker',
  lego: 'LEGO',
  legos: 'LEGO',
  camera: 'Máy ảnh',
  cameras: 'Máy ảnh',
  photography: 'Máy ảnh',
  card: 'Thẻ sưu tầm',
  cards: 'Thẻ sưu tầm',
  collectible: 'Đồ sưu tầm',
  collectibles: 'Đồ sưu tầm',
  toy: 'Đồ chơi sưu tầm',
  toys: 'Đồ chơi sưu tầm',
  stamp: 'Tem sưu tầm',
  stamps: 'Tem sưu tầm',
  coin: 'Tiền xu sưu tầm',
  coins: 'Tiền xu sưu tầm',
  memorabilia: 'Kỷ vật sưu tầm',
  art: 'Tác phẩm nghệ thuật',
  other: 'Khác',
};

function normalizeCategoryLabel(category) {
  const value = String(category?.value || category?.key || '').trim();
  const rawLabel = String(category?.label || '').trim();
  const normalizedValue = value.toLowerCase();
  const normalizedLabel = rawLabel.toLowerCase();

  const mappedLabel = CATEGORY_LABEL_MAP[normalizedValue]
    || CATEGORY_LABEL_MAP[normalizedLabel];

  return {
    ...category,
    label: mappedLabel || rawLabel || value,
    allowCustomValue: category?.allowCustomValue ?? normalizedValue === 'other',
  };
}

function getDefaultCategories() {
  return DEFAULT_CATEGORY_OPTIONS.map(normalizeCategoryLabel);
}

export function useAssetCategories() {
  const [categories, setCategories] = useState(getDefaultCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/assets/categories');
      const nextCategories = Array.isArray(response) ? response : response?.data || [];
      setCategories(
        nextCategories.length > 0
          ? nextCategories.map(normalizeCategoryLabel)
          : getDefaultCategories()
      );
      setError(null);
    } catch (nextError) {
      setError(nextError);
      setCategories((currentCategories) => (
        currentCategories.length > 0 ? currentCategories : getDefaultCategories()
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
