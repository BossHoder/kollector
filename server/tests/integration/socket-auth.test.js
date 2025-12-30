/**
 * Integration Tests: Socket.io Authentication and Room Management
 * Tests per spec.md FR-017 to FR-022
 * @module tests/integration/socket-auth.test
 */

// Load environment variables before any other imports
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.test') });

const http = require('http');
const { Server } = require('socket.io');
const { io: ioc } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const { initSocket, closeSocket, getIO } = require('../../src/config/socket');

// Test utilities
let httpServer;
let ioServer;
let port;

/**
 * Create a test JWT token
 */
function createTestToken(userId, options = {}) {
  const secret = process.env.JWT_ACCESS_SECRET || 'test-secret';
  return jwt.sign(
    { userId, email: 'test@example.com' },
    secret,
    { expiresIn: options.expiresIn || '1h' }
  );
}

/**
 * Create a connected Socket.io client
 */
function createClient(token, options = {}) {
  const auth = token ? { token } : undefined;
  return ioc(`http://localhost:${port}`, {
    auth,
    forceNew: true,
    transports: ['websocket'],
    ...options
  });
}

describe('Socket.io Authentication', () => {
  beforeAll((done) => {
    // Set test JWT secret if not set
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret';
    
    // Create HTTP server and Socket.io
    httpServer = http.createServer();
    ioServer = initSocket(httpServer);
    
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      done();
    });
  });

  afterAll(async () => {
    await closeSocket();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  afterEach(() => {
    // Disconnect all test clients
  });

  /**
   * T027: Integration test - Socket.io connection with valid JWT succeeds
   */
  describe('Valid Authentication', () => {
    it('should connect successfully with valid JWT in auth.token', (done) => {
      const userId = '507f1f77bcf86cd799439011';
      const token = createTestToken(userId);
      
      const client = createClient(token);
      
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (err) => {
        client.disconnect();
        done(new Error(`Connection failed: ${err.message}`));
      });
    });

    it('should allow connection from multiple sockets with same user token', (done) => {
      const userId = '507f1f77bcf86cd799439012';
      const token = createTestToken(userId);
      
      const client1 = createClient(token);
      const client2 = createClient(token);
      
      let connected = 0;
      const onConnect = () => {
        connected++;
        if (connected === 2) {
          expect(client1.connected).toBe(true);
          expect(client2.connected).toBe(true);
          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on('connect', onConnect);
      client2.on('connect', onConnect);
    });
  });

  /**
   * T028: Integration test - Socket.io connection without auth.token fails
   */
  describe('Missing Authentication', () => {
    it('should reject connection without auth.token with "Authentication required"', (done) => {
      const client = createClient(null);
      
      client.on('connect', () => {
        client.disconnect();
        done(new Error('Should not have connected'));
      });

      client.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication required');
        client.disconnect();
        done();
      });
    });

    it('should reject connection with empty auth object', (done) => {
      const client = ioc(`http://localhost:${port}`, {
        auth: {},
        forceNew: true,
        transports: ['websocket']
      });
      
      client.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication required');
        client.disconnect();
        done();
      });
    });
  });

  /**
   * T029: Integration test - Socket.io connection with invalid JWT fails
   */
  describe('Invalid Authentication', () => {
    it('should reject connection with invalid JWT with "Invalid token"', (done) => {
      const client = createClient('invalid-token-here');
      
      client.on('connect', () => {
        client.disconnect();
        done(new Error('Should not have connected'));
      });

      client.on('connect_error', (err) => {
        expect(err.message).toBe('Invalid token');
        client.disconnect();
        done();
      });
    });

    it('should reject connection with malformed JWT', (done) => {
      const client = createClient('not.a.valid.jwt.token');
      
      client.on('connect_error', (err) => {
        expect(err.message).toBe('Invalid token');
        client.disconnect();
        done();
      });
    });

    it('should reject connection with expired JWT', (done) => {
      const userId = '507f1f77bcf86cd799439013';
      const token = createTestToken(userId, { expiresIn: '-1s' });
      const client = createClient(token);
      
      client.on('connect_error', (err) => {
        expect(err.message).toBe('Token expired');
        client.disconnect();
        done();
      });
    });
  });

  /**
   * T030: Integration test - Client joins correct room on connect
   */
  describe('Room Management', () => {
    it('should join room user:<userId> on connect', (done) => {
      const userId = '507f1f77bcf86cd799439014';
      const token = createTestToken(userId);
      const expectedRoom = `user:${userId}`;
      
      const client = createClient(token);
      
      client.on('connect', async () => {
        // Give time for room join to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check server-side that socket is in the room
        const io = getIO();
        const sockets = await io.in(expectedRoom).fetchSockets();
        
        expect(sockets.length).toBeGreaterThan(0);
        expect(sockets.some(s => s.id === client.id)).toBe(true);
        
        client.disconnect();
        done();
      });
    });
  });

  /**
   * T033: Integration test - Event emitted to room is received only by that user
   */
  describe('Event Isolation', () => {
    it('should deliver events only to sockets in the target user room', (done) => {
      const userId1 = '507f1f77bcf86cd799439015';
      const userId2 = '507f1f77bcf86cd799439016';
      
      const token1 = createTestToken(userId1);
      const token2 = createTestToken(userId2);
      
      const client1 = createClient(token1);
      const client2 = createClient(token2);
      
      let client1Connected = false;
      let client2Connected = false;
      let client1ReceivedEvent = false;
      let client2ReceivedEvent = false;

      const testPayload = {
        event: 'asset_processed',
        assetId: '507f1f77bcf86cd799439017',
        status: 'active'
      };

      client1.on('asset_processed', (data) => {
        client1ReceivedEvent = true;
        expect(data.assetId).toBe(testPayload.assetId);
      });

      client2.on('asset_processed', () => {
        client2ReceivedEvent = true;
      });

      const checkAndEmit = async () => {
        if (client1Connected && client2Connected) {
          // Emit to user1's room only
          const io = getIO();
          io.to(`user:${userId1}`).emit('asset_processed', testPayload);
          
          // Wait for events to propagate
          await new Promise(resolve => setTimeout(resolve, 200));
          
          expect(client1ReceivedEvent).toBe(true);
          expect(client2ReceivedEvent).toBe(false);
          
          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on('connect', () => {
        client1Connected = true;
        checkAndEmit();
      });

      client2.on('connect', () => {
        client2Connected = true;
        checkAndEmit();
      });
    });

    it('should deliver events to all sockets of the same user', (done) => {
      const userId = '507f1f77bcf86cd799439018';
      const token = createTestToken(userId);
      
      const client1 = createClient(token);
      const client2 = createClient(token);
      
      let receivedCount = 0;
      const testPayload = { assetId: 'test-asset', status: 'active' };

      const onEvent = () => {
        receivedCount++;
        if (receivedCount === 2) {
          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on('asset_processed', onEvent);
      client2.on('asset_processed', onEvent);

      let connectedCount = 0;
      const onConnect = async () => {
        connectedCount++;
        if (connectedCount === 2) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const io = getIO();
          io.to(`user:${userId}`).emit('asset_processed', testPayload);
        }
      };

      client1.on('connect', onConnect);
      client2.on('connect', onConnect);
    });
  });
});
