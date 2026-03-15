/**
 * ToastContext Provider
 *
 * Manages toast notifications with configurable duration.
 */

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  persistent: boolean;
  duration: number;
}

export interface ToastOptions {
  persistent?: boolean;
  duration?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const AUTO_DISMISS_DURATION = 3000;

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}) => {
      const id = generateId();
      const persistent = Boolean(options.persistent);
      const duration = options.duration ?? AUTO_DISMISS_DURATION;

      const newToast: Toast = {
        id,
        type,
        message,
        persistent,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    [generateId]
  );

  const showSuccess = useCallback(
    (message: string, options?: ToastOptions) => showToast('success', message, options),
    [showToast]
  );

  const showError = useCallback(
    (message: string, options?: ToastOptions) => showToast('error', message, options),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, options?: ToastOptions) => showToast('info', message, options),
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, options?: ToastOptions) => showToast('warning', message, options),
    [showToast]
  );

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextValue = useMemo(
    () => ({
      toasts,
      showToast,
      showSuccess,
      showError,
      showInfo,
      showWarning,
      dismissToast,
      clearAllToasts,
    }),
    [
      toasts,
      showToast,
      showSuccess,
      showError,
      showInfo,
      showWarning,
      dismissToast,
      clearAllToasts,
    ]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export { ToastContext, AUTO_DISMISS_DURATION };
