/**
 * AssetsPage
 *
 * Main assets library page matching stitch_kollector_assets_library_page design
 * Displays paginated asset grid with filtering
 */

import { useState } from 'react';
import { useAssets } from '@/hooks/useAssets';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AssetFilters } from '@/components/assets/AssetFilters';
import type { AssetCategory, AssetStatus } from '@/types/asset';

export function AssetsPage() {
  const [category, setCategory] = useState<AssetCategory | undefined>();
  const [status, setStatus] = useState<AssetStatus | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useAssets({
    category,
    status,
    page,
    limit: 12,
  });

  const handleCategoryChange = (newCategory: AssetCategory | undefined) => {
    setCategory(newCategory);
    setPage(1); // Reset to first page when filter changes
  };

  const handleStatusChange = (newStatus: AssetStatus | undefined) => {
    setStatus(newStatus);
    setPage(1); // Reset to first page when filter changes
  };

  const handleClearFilters = () => {
    setCategory(undefined);
    setStatus(undefined);
    setPage(1);
  };

  // Error state
  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-red-400">
              error
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Đã xảy ra lỗi
          </h3>
          <p className="text-text-secondary max-w-md">
            {(error as Error)?.message || 'Không thể tải danh sách tài sản. Vui lòng thử lại.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 bg-surface-dark hover:bg-surface-highlight text-white px-4 py-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Thử lại</span>
          </button>
        </div>
      </div>
    );
  }

  const assets = data?.assets ?? data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Thư viện tài sản</h1>
          <p className="text-text-secondary mt-1">
            {isLoading ? 'Đang tải...' : `${total} tài sản`}
          </p>
        </div>

        {/* Upload Button */}
        <a
          href="/app/upload"
          className="inline-flex items-center gap-2 bg-primary hover:bg-[#1de0bf] text-[#111817] font-semibold px-5 py-2.5 rounded-lg transition-all self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
          <span>Tải lên</span>
        </a>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <AssetFilters
          category={category}
          status={status}
          onCategoryChange={handleCategoryChange}
          onStatusChange={handleStatusChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Assets Grid */}
      <AssetGrid assets={assets} isLoading={isLoading} />

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-dark border border-border-dark text-text-secondary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang trước"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>

          <span className="text-sm text-text-secondary px-4">
            Trang {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-dark border border-border-dark text-text-secondary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang sau"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
