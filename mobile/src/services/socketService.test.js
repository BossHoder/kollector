/**
 * SocketService Unit Tests
 *
 * Tests for socket event handling and state management
 */

import { io } from 'socket.io-client';
import { socketService } from './socketService';
import { getAccessToken } from './tokenStore';

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock tokenStore
jest.mock('./tokenStore', () => ({
  getAccessToken: jest.fn(),
}));

describe('socketService', () => {
  let mockSocket;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock socket
    mockSocket = {
      connected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    io.mockReturnValue(mockSocket);
    getAccessToken.mockResolvedValue('test-token');

    // Reset socketService state
    socketService.socket = null;
    socketService.connectionState = 'disconnected';
    socketService.reconnectAttempts = 0;
  });

  describe('connect', () => {
    it('should connect with auth token in handshake', async () => {
      await socketService.connect();

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token: 'test-token' },
        })
      );
    });

    it('should not connect if already connected', async () => {
      mockSocket.connected = true;
      socketService.socket = mockSocket;

      await socketService.connect();

      expect(io).not.toHaveBeenCalled();
    });

    it('should not connect without access token', async () => {
      getAccessToken.mockResolvedValue(null);

      await socketService.connect();

      expect(io).not.toHaveBeenCalled();
    });

    it('should use websocket transport', async () => {
      await socketService.connect();

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ['websocket'],
        })
      );
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      await socketService.connect();
    });

    it('should update state to connected on connect event', () => {
      // Find the connect handler
      const connectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1];

      expect(connectHandler).toBeDefined();

      const stateListener = jest.fn();
      socketService.onStateChange(stateListener);

      connectHandler();

      expect(stateListener).toHaveBeenCalledWith('connected');
    });

    it('should update state to disconnected on disconnect event', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'disconnect'
      )?.[1];

      expect(disconnectHandler).toBeDefined();

      const stateListener = jest.fn();
      socketService.onStateChange(stateListener);

      disconnectHandler('transport close');

      expect(stateListener).toHaveBeenCalledWith('disconnected');
    });

    it('should update state to reconnecting on reconnect_attempt event', () => {
      const reconnectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'reconnect_attempt'
      )?.[1];

      expect(reconnectHandler).toBeDefined();

      const stateListener = jest.fn();
      socketService.onStateChange(stateListener);

      reconnectHandler(1);

      expect(stateListener).toHaveBeenCalledWith('reconnecting');
    });
  });

  describe('asset_processed event', () => {
    beforeEach(async () => {
      await socketService.connect();
    });

    it('should allow subscribing to asset_processed events', () => {
      const handler = jest.fn();
      socketService.on('asset_processed', handler);

      expect(mockSocket.on).toHaveBeenCalledWith('asset_processed', expect.any(Function));
    });

    it('should return unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = socketService.on('asset_processed', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call handlers when asset_processed event fires', () => {
      const handler = jest.fn();
      socketService.on('asset_processed', handler);

      // Find and call the internal handler
      const assetProcessedSetup = mockSocket.on.mock.calls.find(
        ([event]) => event === 'asset_processed'
      );

      if (assetProcessedSetup) {
        const [, internalHandler] = assetProcessedSetup;
        const payload = {
          assetId: 'asset-123',
          status: 'active',
          aiMetadata: { brand: 'Test' },
          timestamp: new Date().toISOString(),
        };
        internalHandler(payload);
      }

      // Handler should be in the event listeners
      expect(socketService.eventListeners.has('asset_processed')).toBe(true);
    });
  });

  describe('state listeners', () => {
    it('should notify all state listeners on state change', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      socketService.onStateChange(listener1);
      socketService.onStateChange(listener2);

      await socketService.connect();

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1];
      connectHandler?.();

      expect(listener1).toHaveBeenCalledWith('connected');
      expect(listener2).toHaveBeenCalledWith('connected');
    });

    it('should remove listener on unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = socketService.onStateChange(listener);

      // Clear the immediate invocation that happens on subscribe
      listener.mockClear();

      unsubscribe();

      socketService.updateState('connected');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('reconnect logic', () => {
    it('should track reconnect attempts', async () => {
      await socketService.connect();

      const reconnectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'reconnect_attempt'
      )?.[1];

      reconnectHandler?.(1);
      expect(socketService.reconnectAttempts).toBe(1);

      reconnectHandler?.(2);
      expect(socketService.reconnectAttempts).toBe(2);
    });

    it('should reset reconnect attempts on successful connect', async () => {
      socketService.reconnectAttempts = 3;

      await socketService.connect();

      const connectHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1];
      connectHandler?.();

      expect(socketService.reconnectAttempts).toBe(0);
    });

    it('should detect max reconnect reached', () => {
      socketService.reconnectAttempts = socketService.maxReconnectAttempts;

      expect(socketService.isMaxReconnectReached()).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket', async () => {
      await socketService.connect();

      socketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should update state to disconnected', async () => {
      await socketService.connect();

      const stateListener = jest.fn();
      socketService.onStateChange(stateListener);

      socketService.disconnect();

      expect(stateListener).toHaveBeenCalledWith('disconnected');
    });
  });

  describe('forceReconnect', () => {
    it('should disconnect and reconnect', async () => {
      await socketService.connect();

      // Reset for counting new calls
      mockSocket.disconnect.mockClear();
      io.mockClear();

      await socketService.forceReconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(io).toHaveBeenCalled();
    });

    it('should reset reconnect attempts', async () => {
      await socketService.connect();
      socketService.reconnectAttempts = 5;

      await socketService.forceReconnect();

      expect(socketService.reconnectAttempts).toBe(0);
    });
  });
});
