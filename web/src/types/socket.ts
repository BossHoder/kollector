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

export interface AssetImageEnhancedSuccessEvent {
  event: 'asset_image_enhanced';
  assetId: string;
  status: 'succeeded';
  enhancedImageUrl: string;
  attemptCount: number;
  timestamp: string;
}

export interface AssetImageEnhancedFailureEvent {
  event: 'asset_image_enhanced';
  assetId: string;
  status: 'failed';
  error: string;
  attemptCount: number;
  timestamp: string;
}

export type AssetImageEnhancedEvent =
  | AssetImageEnhancedSuccessEvent
  | AssetImageEnhancedFailureEvent;

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
  onAssetImageEnhanced?: (callback: (event: AssetImageEnhancedEvent) => void) => () => void;
}
