/**
 * AssetFilters component
 *
 * Filter controls for assets list:
 * - Category dropdown
 * - Status dropdown
 * - Clear filters button
 */

import type { AssetCategory, AssetStatus } from '@/types/asset';

export interface AssetFiltersProps {
  category?: AssetCategory;
  status?: AssetStatus;
  onCategoryChange: (category: AssetCategory | undefined) => void;
  onStatusChange: (status: AssetStatus | undefined) => void;
  onClearFilters: () => void;
}

const categoryOptions: { value: AssetCategory | ''; label: string }[] = [
  { value: '', label: 'Tất cả danh mục' },
  { value: 'cards', label: 'Thẻ' },
  { value: 'stamps', label: 'Tem' },
  { value: 'coins', label: 'Tiền xu' },
  { value: 'toys', label: 'Đồ chơi' },
  { value: 'art', label: 'Nghệ thuật' },
  { value: 'memorabilia', label: 'Kỷ vật' },
  { value: 'other', label: 'Khác' },
];

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
  onCategoryChange,
  onStatusChange,
  onClearFilters,
}: AssetFiltersProps) {
  const hasFilters = category || status;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Category Filter */}
      <div className="relative">
        <label htmlFor="category-filter" className="sr-only">
          Danh mục
        </label>
        <select
          id="category-filter"
          aria-label="Danh mục"
          value={category || ''}
          onChange={e =>
            onCategoryChange(
              e.target.value ? (e.target.value as AssetCategory) : undefined
            )
          }
          className="appearance-none bg-surface-dark text-white border border-border-dark rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {categoryOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-[18px]">
          expand_more
        </span>
      </div>

      {/* Status Filter */}
      <div className="relative">
        <label htmlFor="status-filter" className="sr-only">
          Trạng thái
        </label>
        <select
          id="status-filter"
          aria-label="Trạng thái"
          value={status || ''}
          onChange={e =>
            onStatusChange(
              e.target.value ? (e.target.value as AssetStatus) : undefined
            )
          }
          className="appearance-none bg-surface-dark text-white border border-border-dark rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-[18px]">
          expand_more
        </span>
      </div>

      {/* Clear Filters */}
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
