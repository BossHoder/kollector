/**
 * Unit tests for socket.ts
 * Tests Socket.io client setup and connection management
 *
 * These tests MUST fail initially per Constitution Test-First principle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Import after mocking
import { createSocket, SocketManager } from '@/lib/socket';
import { io } from 'socket.io-client';

describe('socket client', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSocket', () => {
    it('should create socket with auth token', () => {
      localStorageMock.setItem('accessToken', 'test-token');

      createSocket();

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token: 'test-token' },
        })
      );
    });

    it('should configure reconnection options', () => {
      localStorageMock.setItem('accessToken', 'test-token');

      createSocket();

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 30000,
        })
      );
    });

    it('should not create socket without access token', () => {
      const socket = createSocket();
      expect(socket).toBeNull();
    });
  });

  describe('SocketManager', () => {
    let manager: SocketManager;

    beforeEach(() => {
      manager = new SocketManager();
    });

    afterEach(() => {
      manager.disconnect();
    });

    it('should initialize with disconnected state', () => {
      expect(manager.isConnected()).toBe(false);
    });

    it('should connect when token is available', () => {
      localStorageMock.setItem('accessToken', 'test-token');

      manager.connect();

      expect(io).toHaveBeenCalled();
    });

    it('should not connect when already connected', () => {
      localStorageMock.setItem('accessToken', 'test-token');

      manager.connect();
      manager.connect();

      // Should only call io once
      expect(io).toHaveBeenCalledTimes(1);
    });

    it('should disconnect and cleanup', () => {
      localStorageMock.setItem('accessToken', 'test-token');
      manager.connect();

      manager.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should register event listeners', () => {
      localStorageMock.setItem('accessToken', 'test-token');
      manager.connect();

      const handler = vi.fn();
      manager.on('asset_processed', handler);

      expect(mockSocket.on).toHaveBeenCalledWith('asset_processed', handler);
    });

    it('should unregister event listeners', () => {
      localStorageMock.setItem('accessToken', 'test-token');
      manager.connect();

      const handler = vi.fn();
      manager.off('asset_processed', handler);

      expect(mockSocket.off).toHaveBeenCalledWith('asset_processed', handler);
    });

    it('should emit events', () => {
      localStorageMock.setItem('accessToken', 'test-token');
      manager.connect();

      manager.emit('join_room', { room: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { room: 'test' });
    });

    it('should track connection status', () => {
      localStorageMock.setItem('accessToken', 'test-token');
      manager.connect();

      // Simulate connect event callback
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectCallback) {
        mockSocket.connected = true;
        connectCallback();
      }

      expect(manager.isConnected()).toBe(true);
    });

    it('should expose connection status changes via callback', () => {
      localStorageMock.setItem('accessToken', 'test-token');

      const statusCallback = vi.fn();
      manager.onStatusChange(statusCallback);
      manager.connect();

      // Simulate connect event
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectCallback) {
        mockSocket.connected = true;
        connectCallback();
      }

      expect(statusCallback).toHaveBeenCalledWith('connected');
    });

    it('should handle disconnect events', () => {
      localStorageMock.setItem('accessToken', 'test-token');

      const statusCallback = vi.fn();
      manager.onStatusChange(statusCallback);
      manager.connect();

      // Simulate disconnect event
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectCallback) {
        mockSocket.connected = false;
        disconnectCallback();
      }

      expect(statusCallback).toHaveBeenCalledWith('disconnected');
    });

    it('should handle connect_error events', () => {
      localStorageMock.setItem('accessToken', 'test-token');

      const statusCallback = vi.fn();
      manager.onStatusChange(statusCallback);
      manager.connect();

      // Simulate error event
      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      if (errorCallback) {
        errorCallback(new Error('Connection failed'));
      }

      expect(statusCallback).toHaveBeenCalledWith('error');
    });
  });
});
