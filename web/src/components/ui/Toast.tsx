/**
 * Toast component
 *
 * Displays toast notifications with type-based styling
 * - Success: Green with check icon, auto-dismiss
 * - Error: Red with error icon, persistent
 * - Info: Primary with info icon, auto-dismiss
 * - Warning: Orange with warning icon, auto-dismiss
 */

import { useEffect, useState } from 'react';
import type { Toast as ToastType, ToastType as ToastVariant } from '@/contexts/ToastContext';

export interface ToastProps extends ToastType {
  /** Callback when toast is dismissed */
  onDismiss: (id: string) => void;
}

const typeConfig: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    icon: 'check_circle',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    icon: 'error',
  },
  info: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary',
    icon: 'info',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    icon: 'warning',
  },
};

export function Toast({ id, type, message, persistent, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = typeConfig[type];

  // Animate in on mount
  useEffect(() => {
    // Small delay to trigger CSS transition
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation to complete before removing
    setTimeout(() => onDismiss(id), 200);
  };

  return (
    <div
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm',
        'transform transition-all duration-200',
        config.bg,
        config.border,
        isVisible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
      ].join(' ')}
    >
      <span
        className={`material-symbols-outlined text-[20px] flex-shrink-0 ${config.text}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      <p className={`text-sm font-medium flex-1 ${config.text}`}>{message}</p>

      {persistent && (
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 ${config.text} hover:opacity-80 transition-opacity`}
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

/**
 * Container for rendering toasts
 * Positioned at top-right of viewport
 */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
