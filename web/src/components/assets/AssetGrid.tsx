/**
 * AssetGrid component
 *
 * Responsive grid layout for displaying asset cards
 * Includes loading skeleton and empty state
 */

import { AssetCard } from './AssetCard';
import { SkeletonAssetCard } from '@/components/ui/Skeleton';
import type { Asset } from '@/types/asset';

export interface AssetGridProps {
  assets: Asset[];
  isLoading?: boolean;
  skeletonCount?: number;
}

export function AssetGrid({
  assets,
  isLoading = false,
  skeletonCount = 6,
}: AssetGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonAssetCard key={index} />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return <AssetEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {assets.map(asset => (
        <AssetCard key={asset._id} asset={asset} />
      ))}
    </div>
  );
}

function AssetEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-highlight flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-text-secondary">
          collections
        </span>
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">
        Chưa có tài sản nào
      </h3>
      <p className="text-text-secondary max-w-md mb-6">
        Bắt đầu bộ sưu tập của bạn bằng cách tải lên ảnh tài sản đầu tiên.
      </p>

      <a
        href="/app/upload"
        className="inline-flex items-center gap-2 bg-primary hover:bg-[#1de0bf] text-[#111817] font-semibold px-6 py-3 rounded-lg transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
        <span>Tải lên ngay</span>
      </a>
    </div>
  );
}
