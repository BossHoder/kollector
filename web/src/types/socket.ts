/**
 * Socket.io event types
 * Source: asset-processed-event.schema.json
 */

import type { ConfidenceValue, AIMetadata } from './asset';

export interface AssetProcessedSuccessEvent {
  event: 'asset_processed';
  assetId: string;
  status: 'active' | 'partial';
  aiMetadata?: AIMetadata;
  processedImageUrl?: string;
  timestamp: string; // ISO 8601
}

export interface AssetProcessedFailureEvent {
  event: 'asset_processed';
  assetId: string;
  status: 'failed';
  error: string;
  timestamp: string; // ISO 8601
}

export type AssetProcessedEvent = AssetProcessedSuccessEvent | AssetProcessedFailureEvent;

// Socket connection state
export type SocketStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

export interface SocketState {
  status: SocketStatus;
  error?: string;
}

export interface SocketContextValue extends SocketState {
  isConnected: boolean;
  connect?: (token: string) => void;
  disconnect?: () => void;
  subscribeToAsset: (assetId: string) => void;
  unsubscribeFromAsset: (assetId: string) => void;
  onAssetProcessed?: (callback: (event: AssetProcessedEvent) => void) => () => void;
}
