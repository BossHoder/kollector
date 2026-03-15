/**
 * AssetCard component
 *
 * Displays a single asset in a card format with:
 * - Thumbnail image
 * - Title
 * - Category badge
 * - Status pill
 * - Created date
 */

import { Link } from 'react-router-dom';
import { StatusPill } from '@/components/ui/StatusPill';
import type { Asset } from '@/types/asset';
import type { AssetCategoryOption } from '@/hooks/useAssetCategories';

export interface AssetCardProps {
  asset: Asset;
  categoryOptions?: AssetCategoryOption[];
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function AssetCard({ asset, categoryOptions = [] }: AssetCardProps) {
  const categoryLabel =
    categoryOptions.find((option) => option.value === asset.category)?.label ||
    asset.category;

  return (
    <Link
      to={`/app/assets/${asset._id}`}
      className="group block bg-surface-dark border border-border-dark rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-[0_0_20px_-5px_rgba(37,244,209,0.2)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-background-dark">
        <img
          src={asset.thumbnailUrl || asset.imageUrl}
          alt={asset.title || 'Asset image'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {(asset.status === 'processing' || asset.status === 'failed') && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <StatusPill status={asset.status} size="md" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="text-white font-medium truncate group-hover:text-primary transition-colors">
          {asset.title || 'Chưa có tiêu đề'}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary bg-surface-highlight px-2 py-1 rounded">
            {categoryLabel}
          </span>

          {asset.status !== 'processing' && asset.status !== 'failed' && (
            <StatusPill status={asset.status} size="sm" showIcon={false} />
          )}
        </div>

        <p className="text-xs text-text-secondary">
          {formatDate(asset.createdAt)}
        </p>
      </div>
    </Link>
  );
}
