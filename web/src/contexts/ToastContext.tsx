/**
 * ToastContext Provider
 *
 * Manages toast notifications with configurable duration
 * - Success: 3 seconds auto-dismiss
 * - Error: Persistent (requires manual dismiss)
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
}

export interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Duration in ms for auto-dismiss toasts */
const AUTO_DISMISS_DURATION = 3000;

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Generate unique ID for toast
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Dismiss a specific toast
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Show a toast with specified type
  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = generateId();

      // Error toasts are persistent, others auto-dismiss
      const persistent = type === 'error';

      const newToast: Toast = {
        id,
        type,
        message,
        persistent,
      };

      setToasts(prev => [...prev, newToast]);

      // Auto-dismiss non-persistent toasts
      if (!persistent) {
        setTimeout(() => {
          dismissToast(id);
        }, AUTO_DISMISS_DURATION);
      }
    },
    [generateId, dismissToast]
  );

  // Convenience methods
  const showSuccess = useCallback(
    (message: string) => showToast('success', message),
    [showToast]
  );

  const showError = useCallback(
    (message: string) => showToast('error', message),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string) => showToast('info', message),
    [showToast]
  );

  const showWarning = useCallback(
    (message: string) => showToast('warning', message),
    [showToast]
  );

  // Clear all toasts
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

/**
 * Hook to access toast context
 *
 * @throws If used outside ToastProvider
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export { ToastContext };
