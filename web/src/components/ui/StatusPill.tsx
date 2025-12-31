/**
 * StatusPill component
 *
 * Displays asset status with color-coded pill
 * Maps backend status values to UI display via status-display utility
 */

import { getStatusDisplay, type StatusDisplayInfo } from '@/lib/status-display';
import type { AssetStatus } from '@/types/asset';

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Asset status from backend */
  status: AssetStatus;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show icon */
  showIcon?: boolean;
}

const colorClasses: Record<StatusDisplayInfo['color'], string> = {
  gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const sizeClasses = {
  sm: 'h-6 px-2 text-xs gap-1',
  md: 'h-7 px-3 text-sm gap-1.5',
};

const iconSizeClasses = {
  sm: 'text-[14px]',
  md: 'text-[16px]',
};

export function StatusPill({
  status,
  size = 'md',
  showIcon = true,
  className = '',
  ...props
}: StatusPillProps) {
  const displayInfo = getStatusDisplay(status);

  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        'font-medium rounded-full border',
        colorClasses[displayInfo.color],
        sizeClasses[size],
        displayInfo.animated && 'animate-pulse',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {showIcon && (
        <span
          className={[
            'material-symbols-outlined',
            iconSizeClasses[size],
            displayInfo.animated && 'animate-spin',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          {displayInfo.icon}
        </span>
      )}
      <span>{displayInfo.label}</span>
    </span>
  );
}
