/**
 * AssetDetailPage
 *
 * Display asset details with AI metadata, image toggle, and status-specific UI
 * Matches Stitch prototype design from stitch_kollector_assets_detail_page
 */

import { useParams, Link } from 'react-router-dom';
import { useAsset } from '@/hooks/useAssets';
import { useRetryAsset } from '@/hooks/useRetryAsset';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConfidenceBar } from '@/components/ui/ConfidenceBar';
import { ImageToggle } from '@/components/assets/ImageToggle';
import { ProcessingOverlay } from '@/components/assets/ProcessingOverlay';

export function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { data: asset, isLoading, isError } = useAsset(assetId);
  const retryMutation = useRetryAsset();

  const handleRetry = async () => {
    if (!assetId) return;
    try {
      await retryMutation.mutateAsync(assetId);
    } catch {
      // Error handled by React Query
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          <Skeleton height="2rem" width="30%" />
          <Skeleton height="20rem" variant="rounded" />
          <div className="space-y-4">
            <Skeleton height="1rem" width="60%" />
            <Skeleton height="1rem" width="40%" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-6xl text-red-400 mb-4">
            error
          </span>
          <h2 className="text-xl font-semibold text-white mb-2">
            Không tìm thấy tài sản
          </h2>
          <Link
            to="/app"
            className="text-primary hover:underline mt-4"
          >
            Quay lại thư viện
          </Link>
        </div>
      </div>
    );
  }

  const isProcessing = asset.status === 'processing';
  const isFailed = asset.status === 'failed';
  const hasAiMetadata = asset.aiMetadata && !asset.aiMetadata.error;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back Link */}
      <Link
        to="/app"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-6"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        <span>Quay lại thư viện</span>
      </Link>

      {/* Asset Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {asset.title || 'Chưa có tiêu đề'}
          </h1>
          <p className="text-text-secondary mt-1 capitalize">{asset.category}</p>
        </div>
        <StatusPill status={asset.status} data-testid="status-pill" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Image */}
        <div className="relative">
          <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden p-4">
            <ImageToggle
              originalUrl={asset.imageUrl || ''}
              processedUrl={asset.thumbnailUrl || ''} // Using thumbnail as "processed" for now
              alt={asset.title || 'Asset'}
            />
          </div>

          {/* Processing Overlay */}
          {isProcessing && (
            <ProcessingOverlay message="Đang xử lý" />
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Status-specific Messages */}
          {isProcessing && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-blue-400 animate-pulse">
                  hourglass_empty
                </span>
                <div>
                  <p className="text-white font-medium">Đang xử lý</p>
                  <p className="text-text-secondary text-sm">
                    AI đang phân tích tài sản của bạn
                  </p>
                </div>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-red-400">
                  error
                </span>
                <div className="flex-1">
                  <p className="text-white font-medium">Phân tích thất bại</p>
                  <p className="text-text-secondary text-sm mt-1">
                    {asset.aiMetadata?.error || 'Unable to analyze image'}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3"
                    onClick={handleRetry}
                    isLoading={retryMutation.isPending}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      refresh
                    </span>
                    Thử lại
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* AI Metadata Section */}
          {hasAiMetadata && (
            <div className="bg-surface-dark border border-border-dark rounded-xl p-6 space-y-6" data-testid="ai-metadata">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  auto_awesome
                </span>
                Phân tích AI
              </h2>

              {/* Description */}
              {asset.aiMetadata?.description && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
                    Mô tả
                  </h3>
                  <p className="text-white">{asset.aiMetadata.description}</p>
                </div>
              )}

              {/* Condition */}
              {asset.aiMetadata?.condition && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
                    Tình trạng
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {asset.aiMetadata.condition.value}
                    </span>
                  </div>
                  <ConfidenceBar
                    value={asset.aiMetadata.condition.confidence}
                    label="Độ tin cậy"
                  />
                </div>
              )}

              {/* Authenticity */}
              {asset.aiMetadata?.authenticity && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
                    Xác thực
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {asset.aiMetadata.authenticity.value}
                    </span>
                  </div>
                  <ConfidenceBar
                    value={asset.aiMetadata.authenticity.confidence}
                    label="Độ tin cậy"
                  />
                </div>
              )}

              {/* Estimated Value */}
              {asset.aiMetadata?.estimatedValue && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
                    Giá trị ước tính
                  </h3>
                  <p className="text-white text-lg font-semibold">
                    ${asset.aiMetadata.estimatedValue.min} - ${asset.aiMetadata.estimatedValue.max}
                    <span className="text-text-secondary text-sm ml-2">
                      {asset.aiMetadata.estimatedValue.currency}
                    </span>
                  </p>
                </div>
              )}

              {/* Tags */}
              {asset.aiMetadata?.tags && asset.aiMetadata.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {asset.aiMetadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-[#111817] text-text-secondary text-sm rounded-full border border-border-dark"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File Info */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Thông tin file</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Tên file</dt>
                <dd className="text-white">{asset.originalFilename}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Kích thước</dt>
                <dd className="text-white">{asset.fileSizeMB?.toFixed(2)} MB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Định dạng</dt>
                <dd className="text-white">{asset.mimeType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Tải lên lúc</dt>
                <dd className="text-white">
                  {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
