/**
 * Socket Service
 *
 * Manages Socket.io connection for real-time updates.
 * - Authenticates via handshake.auth.token (JWT)
 * - Handles connection/disconnection events
 * - Exposes methods to subscribe to asset events
 */

import { io } from 'socket.io-client';
import { getAccessToken } from './tokenStore';
import {
  SHOULD_LIMIT_ANDROID_SOCKET_TRANSPORTS,
  SOCKET_URL,
} from '../config/runtime';

const SOCKET_TRANSPORTS = SHOULD_LIMIT_ANDROID_SOCKET_TRANSPORTS
  ? ['polling']
  : ['websocket', 'polling'];

/**
 * @typedef {'connected' | 'disconnected' | 'connecting' | 'reconnecting'} ConnectionState
 */

/**
 * @typedef {Object} AssetProcessedPayload
 * @property {string} assetId
 * @property {string} status
 * @property {Object} [aiMetadata]
 * @property {string} [processedImageUrl]
 * @property {string} timestamp
 */

/**
 * Socket service singleton
 */
class SocketService {
  constructor() {
    /** @type {import('socket.io-client').Socket | null} */
    this.socket = null;
    
    /** @type {ConnectionState} */
    this.connectionState = 'disconnected';
    
    /** @type {Set<function>} */
    this.stateListeners = new Set();
    
    /** @type {Map<string, Set<function>>} */
    this.eventListeners = new Map();
    
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Connect to the socket server
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = await getAccessToken();
    
    if (!token) {
      console.warn('Cannot connect to socket: no access token');
      return;
    }

    this.updateState('connecting');

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: SOCKET_TRANSPORTS,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupListeners();
  }

  /**
   * Setup socket event listeners
   */
  setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.updateState('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.updateState('disconnected');
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log('Socket reconnect attempt:', attempt);
      this.reconnectAttempts = attempt;
      this.updateState('reconnecting');
    });

    this.socket.on('reconnect_failed', () => {
      console.log('Socket reconnect failed');
      this.updateState('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.updateState('disconnected');
    });

    // Handle asset_processed events
    this.socket.on('asset_processed', (payload) => {
      this.emit('asset_processed', payload);
    });

    this.socket.on('asset_image_enhanced', (payload) => {
      this.emit('asset_image_enhanced', payload);
    });
  }

  /**
   * Disconnect from the socket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateState('disconnected');
  }

  /**
   * Update connection state and notify listeners
   * @param {ConnectionState} newState
   */
  updateState(newState) {
    this.connectionState = newState;
    this.stateListeners.forEach((listener) => listener(newState));
  }

  /**
   * Subscribe to connection state changes
   * @param {function(ConnectionState): void} listener
   * @returns {function} Unsubscribe function
   */
  onStateChange(listener) {
    this.stateListeners.add(listener);
    // Immediately notify of current state
    listener(this.connectionState);
    
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Subscribe to a socket event
   * @param {string} event - Event name
   * @param {function} listener - Event handler
   * @returns {function} Unsubscribe function
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(listener);

    return () => {
      this.eventListeners.get(event)?.delete(listener);
    };
  }

  /**
   * Emit to internal event listeners
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Get current connection state
   * @returns {ConnectionState}
   */
  getState() {
    return this.connectionState;
  }

  /**
   * Get reconnect attempt count
   * @returns {number}
   */
  getReconnectAttempts() {
    return this.reconnectAttempts;
  }

  /**
   * Check if max reconnect attempts reached
   * @returns {boolean}
   */
  isMaxReconnectReached() {
    return this.reconnectAttempts >= this.maxReconnectAttempts;
  }

  /**
   * Force a reconnect attempt
   */
  async forceReconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }
}

// Export singleton instance
export const socketService = new SocketService();

export default socketService;
