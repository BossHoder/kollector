/**
 * SocketContext Provider
 *
 * Manages Socket.io connection and provides real-time event handling
 * Connects after authentication and disconnects on logout
 */

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketManager, SocketStatus } from '@/lib/socket';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import type { SocketState, SocketContextValue } from '@/types/socket';
import type { AssetProcessedEvent } from '@/types/socket';
import type { Asset } from '@/types/asset';

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useToast();

  const [state, setState] = useState<SocketState>({
    status: 'disconnected',
    error: undefined,
  });

  // Handle connection status changes
  useEffect(() => {
    const unsubscribe = socketManager.onStatusChange((status: SocketStatus) => {
      setState(prev => ({
        ...prev,
        status,
        error: status === 'error' ? 'Connection error' : undefined,
      }));
    });

    return unsubscribe;
  }, []);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      socketManager.connect();
    } else {
      socketManager.disconnect();
    }

    return () => {
      socketManager.disconnect();
    };
  }, [isAuthenticated]);

  // Handle asset_processed events - update React Query cache and show toast
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleAssetProcessed = (event: AssetProcessedEvent) => {
      // Update the specific asset in cache
      queryClient.setQueryData<Asset>(
        ['asset', event.assetId],
        (oldAsset) => {
          if (!oldAsset) return oldAsset;

          const aiMetadata = 'aiMetadata' in event ? event.aiMetadata : oldAsset.aiMetadata;
          const errorMessage = 'error' in event ? event.error : undefined;

          return {
            ...oldAsset,
            status: event.status,
            aiMetadata,
            ...(errorMessage && { error: errorMessage }),
          };
        }
      );

      // Invalidate assets list to refetch
      queryClient.invalidateQueries({ queryKey: ['assets'] });

      // Show toast notification based on status
      if (event.status === 'active') {
        showSuccess('Tài sản đã được phân tích thành công!');
      } else if (event.status === 'failed') {
        const errorMessage = 'error' in event ? event.error : 'Lỗi không xác định';
        showError(`Phân tích thất bại: ${errorMessage}`);
      } else if ('status' in event && event.status === 'partial') {
        showInfo('Phân tích hoàn tất một phần. Một số dữ liệu có thể thiếu.');
      }
    };

    socketManager.on<AssetProcessedEvent>('asset_processed', handleAssetProcessed);

    return () => {
      socketManager.off<AssetProcessedEvent>('asset_processed', handleAssetProcessed);
    };
  }, [isAuthenticated, queryClient, showSuccess, showError, showInfo]);

  // Subscribe to specific asset updates
  const subscribeToAsset = useCallback((assetId: string) => {
    socketManager.emit('subscribe_asset', { assetId });
  }, []);

  // Unsubscribe from asset updates
  const unsubscribeFromAsset = useCallback((assetId: string) => {
    socketManager.emit('unsubscribe_asset', { assetId });
  }, []);

  const value: SocketContextValue = useMemo(
    () => ({
      ...state,
      isConnected: state.status === 'connected',
      subscribeToAsset,
      unsubscribeFromAsset,
    }),
    [state, subscribeToAsset, unsubscribeFromAsset]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/**
 * Hook to access socket context
 *
 * @throws If used outside SocketProvider
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context;
}

export { SocketContext };
