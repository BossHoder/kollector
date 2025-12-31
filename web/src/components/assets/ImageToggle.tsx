/**
 * ImageToggle component
 *
 * Toggle between original and processed images
 * Shows before/after comparison for AI processed assets
 */

import { useState } from 'react';

interface ImageToggleProps {
  /** Original image URL */
  originalUrl: string;
  /** Processed image URL (optional - may not exist for processing/failed) */
  processedUrl?: string | null;
  /** Alt text for images */
  alt?: string;
  /** Callback when toggle changes */
  onToggle?: (showProcessed: boolean) => void;
}

export function ImageToggle({
  originalUrl,
  processedUrl,
  alt = 'Asset image',
  onToggle,
}: ImageToggleProps) {
  const [showProcessed, setShowProcessed] = useState(!!processedUrl);
  const hasProcessed = !!processedUrl;

  const handleToggle = (value: boolean) => {
    if (!hasProcessed) return;
    setShowProcessed(value);
    onToggle?.(value);
  };

  const currentUrl = showProcessed && processedUrl ? processedUrl : originalUrl;

  return (
    <div className="space-y-4">
      {/* Image Display */}
      <div className="relative aspect-square bg-[#111817] rounded-xl overflow-hidden">
        <img
          src={currentUrl}
          alt={alt}
          className="w-full h-full object-contain"
        />
        
        {/* Toggle indicator overlay */}
        {hasProcessed && (
          <div className="absolute bottom-4 right-4 bg-surface-dark/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium text-white">
            {showProcessed ? 'Đã xử lý' : 'Gốc'}
          </div>
        )}
      </div>

      {/* Toggle Controls */}
      {hasProcessed && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleToggle(false)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              !showProcessed
                ? 'bg-primary text-[#111817]'
                : 'bg-surface-dark text-text-secondary hover:text-white',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 align-middle">
              image
            </span>
            Ảnh gốc
          </button>
          
          <button
            type="button"
            onClick={() => handleToggle(true)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              showProcessed
                ? 'bg-primary text-[#111817]'
                : 'bg-surface-dark text-text-secondary hover:text-white',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 align-middle">
              auto_fix_high
            </span>
            Đã xử lý
          </button>
        </div>
      )}

      {/* No processed image message */}
      {!hasProcessed && (
        <p className="text-sm text-text-secondary text-center">
          Ảnh đã xử lý sẽ hiển thị sau khi AI hoàn tất phân tích
        </p>
      )}
    </div>
  );
}
