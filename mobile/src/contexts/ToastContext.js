/**
 * Toast Context
 *
 * Provides toast notification functionality across the app.
 * - Success and info toasts auto-dismiss after 3 seconds
 * - Error toasts persist until dismissed manually
 * - Duplicate/spam prevention for offline/online transitions
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * @typedef {'success' | 'error' | 'info' | 'warning'} ToastType
 */

/**
 * @typedef {Object} Toast
 * @property {string} id - Unique identifier
 * @property {ToastType} type - Toast type
 * @property {string} message - Toast message
 * @property {boolean} persistent - Whether toast persists until dismissed
 */

const ToastContext = createContext(null);

const AUTO_DISMISS_DURATION = 3000; // 3 seconds
const DUPLICATE_THRESHOLD_MS = 2000; // Don't show same message within 2 seconds

/**
 * Generate a unique ID for toasts
 */
const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

/**
 * Toast Provider Component
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const recentMessagesRef = useRef(new Map()); // Track recent messages to prevent duplicates

  /**
   * Clean up old entries from recent messages map
   */
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

  /**
   * Check if a message was recently shown
   * @param {string} message
   * @returns {boolean}
   */
  const isRecentDuplicate = useCallback((message) => {
    cleanupRecentMessages();
    const key = message.toLowerCase().trim();
    return recentMessagesRef.current.has(key);
  }, [cleanupRecentMessages]);

  /**
   * Mark a message as recently shown
   * @param {string} message
   */
  const markAsRecent = useCallback((message) => {
    const key = message.toLowerCase().trim();
    recentMessagesRef.current.set(key, Date.now());
  }, []);

  /**
   * Add a toast notification
   * @param {ToastType} type - Toast type
   * @param {string} message - Toast message
   * @param {Object} [options] - Options
   * @param {boolean} [options.persistent] - Override auto-dismiss behavior
   * @param {boolean} [options.allowDuplicate] - Allow duplicate messages
   */
  const addToast = useCallback((type, message, options = {}) => {
    const { allowDuplicate = false, ...restOptions } = options;

    // Coerce message to string — callers may accidentally pass Error objects,
    // arrays (validation errors), or nested objects
    const toReadableString = (val) => {
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map(toReadableString).join('; ');
      if (val && typeof val === 'object') {
        if (typeof val.message === 'string') return val.message;
        if (typeof val.error === 'string') return val.error;
        // Last resort: JSON, but guard against circular structures
        try { return JSON.stringify(val); } catch { return 'An error occurred'; }
      }
      return String(val ?? 'An error occurred');
    };
    const msg = toReadableString(message);

    // Prevent duplicate toast spam (unless explicitly allowed)
    if (!allowDuplicate && isRecentDuplicate(msg)) {
      return null;
    }

    markAsRecent(msg);

    const id = generateId();

    // Error toasts persist by default; others auto-dismiss
    const persistent = restOptions.persistent ?? (type === 'error');

    const newToast = {
      id,
      type,
      message: msg,
      persistent,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss non-persistent toasts
    if (!persistent) {
      timersRef.current[id] = setTimeout(() => {
        dismissToast(id);
      }, AUTO_DISMISS_DURATION);
    }

    return id;
  }, [isRecentDuplicate, markAsRecent]);

  /**
   * Dismiss a toast by ID
   */
  const dismissToast = useCallback((id) => {
    // Clear any pending timer
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }

    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Dismiss all toasts
   */
  const dismissAll = useCallback(() => {
    // Clear all timers
    Object.keys(timersRef.current).forEach((id) => {
      clearTimeout(timersRef.current[id]);
    });
    timersRef.current = {};

    setToasts([]);
  }, []);

  // Convenience methods
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

/**
 * Hook to access toast functionality
 * @returns {{
 *   toasts: Toast[],
 *   addToast: (type: ToastType, message: string, options?: {persistent?: boolean}) => string,
 *   dismissToast: (id: string) => void,
 *   dismissAll: () => void,
 *   success: (message: string, options?: {persistent?: boolean}) => string,
 *   error: (message: string, options?: {persistent?: boolean}) => string,
 *   info: (message: string, options?: {persistent?: boolean}) => string,
 *   warning: (message: string, options?: {persistent?: boolean}) => string,
 * }}
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
