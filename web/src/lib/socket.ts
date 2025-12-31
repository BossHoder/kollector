/**
 * Socket.io client setup
 *
 * Provides socket connection management with:
 * - Auth token in handshake
 * - Reconnection with exponential backoff
 * - Connection status tracking
 */

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type StatusChangeCallback = (status: SocketStatus) => void;

/**
 * Create a new socket connection with auth token
 */
export const createSocket = (): Socket | null => {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  return io(API_BASE_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    transports: ['websocket', 'polling'],
  });
};

/**
 * Socket manager for connection lifecycle management
 *
 * Provides:
 * - Connect/disconnect control
 * - Event registration
 * - Status tracking with callbacks
 */
export class SocketManager {
  private socket: Socket | null = null;
  private statusCallbacks: StatusChangeCallback[] = [];
  private currentStatus: SocketStatus = 'disconnected';

  /**
   * Connect to socket server
   * No-op if already connected
   */
  connect(): void {
    if (this.socket) {
      return;
    }

    this.socket = createSocket();

    if (!this.socket) {
      return;
    }

    this.setupEventHandlers();
    this.updateStatus('connecting');
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateStatus('disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current connection status
   */
  getStatus(): SocketStatus {
    return this.currentStatus;
  }

  /**
   * Register callback for status changes
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register event listener
   */
  on<T>(event: string, handler: (data: T) => void): void {
    this.socket?.on(event, handler);
  }

  /**
   * Remove event listener
   */
  off<T>(event: string, handler: (data: T) => void): void {
    this.socket?.off(event, handler);
  }

  /**
   * Emit event to server
   */
  emit<T>(event: string, data: T): void {
    this.socket?.emit(event, data);
  }

  /**
   * Get underlying socket instance (for advanced use cases)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.updateStatus('connected');
    });

    this.socket.on('disconnect', () => {
      this.updateStatus('disconnected');
    });

    this.socket.on('connect_error', () => {
      this.updateStatus('error');
    });
  }

  private updateStatus(status: SocketStatus): void {
    this.currentStatus = status;
    this.statusCallbacks.forEach(callback => callback(status));
  }
}

/**
 * Singleton socket manager instance
 */
export const socketManager = new SocketManager();
