/**
 * Socket Context
 *
 * Provides socket connection state and methods across the app.
 * - Connects when user is authenticated
 * - Disconnects on logout
 * - Exposes connection state for UI (reconnecting banner, etc.)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { useRealtimeFallback } from '../hooks/useRealtimeFallback';

/**
 * @typedef {'connected' | 'disconnected' | 'connecting' | 'reconnecting'} ConnectionState
 */

const SocketContext = createContext(null);

/**
 * Socket Provider Component
 */
export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    return () => {
      // Don't disconnect on cleanup if still authenticated
      // This prevents disconnection during re-renders
    };
  }, [isAuthenticated]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = socketService.onStateChange((state) => {
      setConnectionState(state);
      setReconnectAttempts(socketService.getReconnectAttempts());
    });

    return unsubscribe;
  }, []);

  /**
   * Subscribe to asset_processed events
   * @param {function} handler
   * @returns {function} Unsubscribe function
   */
  const onAssetProcessed = useCallback((handler) => {
    return socketService.on('asset_processed', handler);
  }, []);

  /**
   * Force reconnect (for manual reconnect button)
   */
  const forceReconnect = useCallback(async () => {
    await socketService.forceReconnect();
  }, []);

  /**
   * Check if showing reconnecting banner
   */
  const isReconnecting = connectionState === 'reconnecting';

  /**
   * Check if max reconnect attempts reached
   */
  const isMaxReconnectReached = socketService.isMaxReconnectReached();
  const fallback = useRealtimeFallback({
    isConnected: connectionState === 'connected',
  });

  const value = useMemo(
    () => ({
      connectionState,
      isConnected: connectionState === 'connected',
      isReconnecting,
      reconnectAttempts,
      isMaxReconnectReached,
      isFallbackActive: fallback.isFallbackActive,
      onAssetProcessed,
      forceReconnect,
    }),
    [
      connectionState,
      isReconnecting,
      reconnectAttempts,
      isMaxReconnectReached,
      fallback.isFallbackActive,
      onAssetProcessed,
      forceReconnect,
    ]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

/**
 * Hook to access socket state and methods
 * @returns {{
 *   connectionState: ConnectionState,
 *   isConnected: boolean,
 *   isReconnecting: boolean,
 *   reconnectAttempts: number,
 *   isMaxReconnectReached: boolean,
 *   onAssetProcessed: (handler: function) => function,
 *   forceReconnect: () => Promise<void>,
 * }}
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
