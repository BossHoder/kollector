import { useEffect, useMemo, useState } from 'react';
import type { AssetCategory, AssetStatus } from '@/types/asset';
import type { AssetCategoryOption } from '@/hooks/useAssetCategories';

export interface AssetFiltersProps {
  category?: AssetCategory;
  status?: AssetStatus;
  categoryOptions: AssetCategoryOption[];
  onCategoryChange: (category: AssetCategory | undefined) => void;
  onStatusChange: (status: AssetStatus | undefined) => void;
  onClearFilters: () => void;
}

const statusOptions: { value: AssetStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Sẵn sàng' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'partial', label: 'Một phần' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'archived', label: 'Đã lưu trữ' },
];

export function AssetFilters({
  category,
  status,
  categoryOptions,
  onCategoryChange,
  onStatusChange,
  onClearFilters,
}: AssetFiltersProps) {
  const categoryValues = useMemo(
    () => new Set(categoryOptions.map((option) => option.value)),
    [categoryOptions]
  );
  const selectedCategoryOption = category
    ? categoryOptions.find((option) => option.value === category)
    : undefined;
  const shouldShowCustomCategory =
    Boolean(selectedCategoryOption?.allowCustomValue) ||
    Boolean(category && !categoryValues.has(category));
  const [customCategory, setCustomCategory] = useState(
    category && !categoryValues.has(category) ? category : ''
  );
  const hasFilters = Boolean(category || status);

  useEffect(() => {
    if (!category) {
      setCustomCategory('');
      return;
    }

    if (!categoryValues.has(category)) {
      setCustomCategory(category);
      return;
    }

    if (category !== 'other') {
      setCustomCategory('');
    }
  }, [category, categoryValues]);

  const renderedCategoryOptions = [
    { value: '', label: 'Tất cả danh mục' },
    ...categoryOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <label htmlFor="category-filter" className="sr-only">
          Danh mục
        </label>
        <select
          id="category-filter"
          aria-label="Danh mục"
          value={category ? (categoryValues.has(category) ? category : 'other') : ''}
          onChange={(e) => {
            const nextValue = e.target.value;

            if (!nextValue) {
              setCustomCategory('');
              onCategoryChange(undefined);
              return;
            }

            if (nextValue === 'other') {
              onCategoryChange(customCategory.trim() || 'other');
              return;
            }

            setCustomCategory('');
            onCategoryChange(nextValue);
          }}
          className="appearance-none bg-surface-dark text-white border border-border-dark rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {renderedCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-[18px]">
          expand_more
        </span>
      </div>

      {shouldShowCustomCategory && (
        <input
          type="text"
          value={customCategory}
          onChange={(e) => {
            const value = e.target.value;
            setCustomCategory(value);
            onCategoryChange(value.trim() || 'other');
          }}
          placeholder="Nhập danh mục tùy chỉnh"
          className="min-w-[220px] bg-surface-dark text-white border border-border-dark rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      )}

      <div className="relative">
        <label htmlFor="status-filter" className="sr-only">
          Trạng thái
        </label>
        <select
          id="status-filter"
          aria-label="Trạng thái"
          value={status || ''}
          onChange={(e) =>
            onStatusChange(
              e.target.value ? (e.target.value as AssetStatus) : undefined
            )
          }
          className="appearance-none bg-surface-dark text-white border border-border-dark rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-[18px]">
          expand_more
        </span>
      </div>

      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          <span>Xóa bộ lọc</span>
        </button>
      )}
    </div>
  );
}
