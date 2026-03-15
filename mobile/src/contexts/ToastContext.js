/**
 * Toast Context
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);
const AUTO_DISMISS_DURATION = 3000;
const DUPLICATE_THRESHOLD_MS = 2000;

const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const recentMessagesRef = useRef(new Map());

  const cleanupRecentMessages = useCallback(() => {
    const now = Date.now();
    const toDelete = [];

    recentMessagesRef.current.forEach((timestamp, key) => {
      if (now - timestamp > DUPLICATE_THRESHOLD_MS) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => recentMessagesRef.current.delete(key));
  }, []);

  const isRecentDuplicate = useCallback((message) => {
    cleanupRecentMessages();
    const key = String(message).toLowerCase().trim();
    return recentMessagesRef.current.has(key);
  }, [cleanupRecentMessages]);

  const markAsRecent = useCallback((message) => {
    const key = String(message).toLowerCase().trim();
    recentMessagesRef.current.set(key, Date.now());
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((type, message, options = {}) => {
    const { allowDuplicate = false, persistent = false, duration = AUTO_DISMISS_DURATION } = options;

    const toReadableString = (value) => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.map(toReadableString).join('; ');
      if (value && typeof value === 'object') {
        if (typeof value.message === 'string') return value.message;
        if (typeof value.error === 'string') return value.error;
        try { return JSON.stringify(value); } catch { return 'An error occurred'; }
      }
      return String(value ?? 'An error occurred');
    };

    const normalizedMessage = toReadableString(message);

    if (!allowDuplicate && isRecentDuplicate(normalizedMessage)) {
      return null;
    }

    markAsRecent(normalizedMessage);

    const newToast = {
      id: generateId(),
      type,
      message: normalizedMessage,
      persistent,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);
    return newToast.id;
  }, [isRecentDuplicate, markAsRecent]);

  const success = useCallback((message, options) => addToast('success', message, options), [addToast]);
  const error = useCallback((message, options) => addToast('error', message, options), [addToast]);
  const info = useCallback((message, options) => addToast('info', message, options), [addToast]);
  const warning = useCallback((message, options) => addToast('warning', message, options), [addToast]);

  const value = {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    success,
    error,
    info,
    warning,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
