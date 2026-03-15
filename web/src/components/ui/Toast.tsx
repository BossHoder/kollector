/**
 * Toast component
 *
 * Displays toast notifications with timed dismissal and progress feedback.
 */

import { useEffect, useRef, useState } from 'react';
import type { Toast as ToastType, ToastType as ToastVariant } from '@/contexts/ToastContext';

export interface ToastProps extends ToastType {
  onDismiss: (id: string) => void;
}

const typeConfig: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: string; progress: string }
> = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    icon: 'check_circle',
    progress: 'bg-emerald-400',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    icon: 'error',
    progress: 'bg-red-400',
  },
  info: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary',
    icon: 'info',
    progress: 'bg-primary',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    icon: 'warning',
    progress: 'bg-orange-400',
  },
};

export function Toast({ id, type, message, persistent, duration, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progressShrinking, setProgressShrinking] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const config = typeConfig[type];

  useEffect(() => {
    const visibilityTimer = window.setTimeout(() => {
      setIsVisible(true);
      if (!persistent) {
        setProgressShrinking(true);
      }
    }, 10);

    if (!persistent) {
      dismissTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        exitTimerRef.current = window.setTimeout(() => onDismiss(id), 220);
      }, duration);
    }

    return () => {
      window.clearTimeout(visibilityTimer);
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
      }
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, [duration, id, onDismiss, persistent]);

  const handleDismiss = () => {
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
    }
    setIsVisible(false);
    exitTimerRef.current = window.setTimeout(() => onDismiss(id), 220);
  };

  return (
    <div
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={[
        'relative overflow-hidden flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm',
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

      <button
        onClick={handleDismiss}
        className={`flex-shrink-0 ${config.text} hover:opacity-80 transition-opacity`}
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>

      {!persistent && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div
            className={[
              'h-full origin-left transition-transform ease-linear',
              config.progress,
              progressShrinking ? 'scale-x-0' : 'scale-x-100',
            ].join(' ')}
            style={{ transitionDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
