/**
 * Skeleton component
 *
 * Loading placeholder with shimmer animation
 * Used for content placeholders during data loading
 */

export interface SkeletonProps {
  /** Width of skeleton (Tailwind class or CSS value) */
  width?: string;
  /** Height of skeleton (Tailwind class or CSS value) */
  height?: string;
  /** Border radius variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Custom className */
  className?: string;
}

const variantClasses = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-lg',
};

export function Skeleton({
  width,
  height,
  variant = 'text',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={[
        'animate-pulse bg-surface-highlight',
        variantClasses[variant],
        className,
      ].join(' ')}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Preset skeleton for text lines
 */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 ? '75%' : '100%'}
          variant="text"
        />
      ))}
    </div>
  );
}

/**
 * Preset skeleton for avatar
 */
export function SkeletonAvatar({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeMap = {
    sm: '2rem',
    md: '2.5rem',
    lg: '3rem',
  };

  return (
    <Skeleton
      width={sizeMap[size]}
      height={sizeMap[size]}
      variant="circular"
      className={className}
    />
  );
}

/**
 * Preset skeleton for card
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-surface-dark border border-border-dark rounded-xl p-4 space-y-4 ${className}`}
    >
      <Skeleton height="8rem" variant="rounded" />
      <div className="space-y-2">
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="0.75rem" width="40%" />
      </div>
    </div>
  );
}

/**
 * Preset skeleton for asset card (matching AssetCard layout)
 */
export function SkeletonAssetCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-surface-dark border border-border-dark rounded-xl overflow-hidden ${className}`}
    >
      {/* Image placeholder */}
      <Skeleton height="12rem" variant="rectangular" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton height="1.25rem" width="80%" />

        {/* Category and status row */}
        <div className="flex items-center justify-between">
          <Skeleton height="1rem" width="30%" />
          <Skeleton height="1.5rem" width="4rem" variant="rounded" />
        </div>

        {/* Date */}
        <Skeleton height="0.75rem" width="50%" />
      </div>
    </div>
  );
}
