/**
 * Unit Tests: Assets Queue Service
 * Tests per contracts/ai-job.schema.json
 * @module tests/unit/assets/queue.test
 */

describe('Assets Queue Service', () => {
  let mockQueueAdd;
  let mockGetJobCounts;
  let mockQueueClose;
  let addToProcessingQueue;
  let getQueueMetrics;
  let DEFAULT_JOB_OPTIONS;
  let QUEUE_NAME;
  
  beforeEach(() => {
    // Reset modules to clear cache
    jest.resetModules();
    
    // Create fresh mock functions for each test
    mockQueueAdd = jest.fn().mockResolvedValue({ id: 'test-job-123' });
    mockGetJobCounts = jest.fn().mockResolvedValue({
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 3,
      delayed: 0,
      paused: 0
    });
    mockQueueClose = jest.fn();
    
    // Mock Redis connection
    jest.doMock('../../../src/config/redis', () => ({
      getConnection: jest.fn().mockReturnValue({
        on: jest.fn(),
        quit: jest.fn()
      }),
      createConnection: jest.fn(),
      closeConnection: jest.fn()
    }));
    
    // Mock logger
    jest.doMock('../../../src/config/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }));
    
    // Mock BullMQ Queue with the fresh mock functions
    jest.doMock('bullmq', () => ({
      Queue: jest.fn().mockImplementation(() => ({
        add: mockQueueAdd,
        getJobCounts: mockGetJobCounts,
        close: mockQueueClose
      })),
      Worker: jest.fn()
    }));
    
    // Now require the module - it will use the mocked dependencies
    const queueModule = require('../../../src/modules/assets/assets.queue');
    addToProcessingQueue = queueModule.addToProcessingQueue;
    getQueueMetrics = queueModule.getQueueMetrics;
    DEFAULT_JOB_OPTIONS = queueModule.DEFAULT_JOB_OPTIONS;
    QUEUE_NAME = queueModule.QUEUE_NAME;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Queue Configuration', () => {
    it('should use correct queue name', () => {
      expect(QUEUE_NAME).toBe('ai-processing');
    });

    it('should have correct default job options per research.md', () => {
      expect(DEFAULT_JOB_OPTIONS).toEqual({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        timeout: 120000,
        removeOnComplete: {
          age: 24 * 3600
        },
        removeOnFail: {
          age: 7 * 24 * 3600
        }
      });
    });
  });

  /**
   * T018: Unit test - Queue addJob() creates job with payload matching ai-job.schema.json
   */
  describe('addToProcessingQueue()', () => {
    it('should create job with payload matching ai-job.schema.json schema', async () => {
      const jobData = {
        assetId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1234567890/assets/original.jpg',
        category: 'sneaker',
        createdAt: '2025-12-28T10:30:00.000Z'
      };

      const jobId = await addToProcessingQueue(jobData);

      expect(jobId).toBe('test-job-123');
      
      // Verify the queue was called with correct data
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'process-asset',
        expect.objectContaining({
          assetId: '507f1f77bcf86cd799439011',
          userId: '507f1f77bcf86cd799439012',
          imageUrl: 'https://res.cloudinary.com/test/image/upload/v1234567890/assets/original.jpg',
          category: 'sneaker',
          createdAt: '2025-12-28T10:30:00.000Z'
        }),
        expect.any(Object)
      );
    });

    it('should only include required fields per ai-job.schema.json (no extra fields)', async () => {
      const jobData = {
        assetId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1234567890/assets/original.jpg',
        category: 'lego',
        createdAt: '2025-12-28T10:30:00.000Z',
        extraField: 'should-not-be-included',
        anotherField: 123
      };

      await addToProcessingQueue(jobData);

      const addCall = mockQueueAdd.mock.calls[0];
      const submittedData = addCall[1];

      // Verify only the 5 required fields are present
      expect(Object.keys(submittedData)).toEqual([
        'assetId',
        'userId',
        'imageUrl',
        'category',
        'createdAt'
      ]);

      // Verify extra fields are NOT included
      expect(submittedData).not.toHaveProperty('extraField');
      expect(submittedData).not.toHaveProperty('anotherField');
    });

    it('should convert assetId and userId to strings', async () => {
      const jobData = {
        assetId: { toString: () => '507f1f77bcf86cd799439011' },
        userId: { toString: () => '507f1f77bcf86cd799439012' },
        imageUrl: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        category: 'camera',
        createdAt: '2025-12-28T10:30:00.000Z'
      };

      await addToProcessingQueue(jobData);

      const addCall = mockQueueAdd.mock.calls[0];
      const submittedData = addCall[1];

      expect(typeof submittedData.assetId).toBe('string');
      expect(typeof submittedData.userId).toBe('string');
    });

    it('should throw error when required field is missing', async () => {
      const requiredFields = ['assetId', 'userId', 'imageUrl', 'category', 'createdAt'];

      for (const fieldToOmit of requiredFields) {
        // Reset modules and mocks before each iteration
        jest.resetModules();
        
        jest.doMock('../../../src/config/redis', () => ({
          getConnection: jest.fn().mockReturnValue({ on: jest.fn(), quit: jest.fn() }),
          createConnection: jest.fn(),
          closeConnection: jest.fn()
        }));
        
        jest.doMock('../../../src/config/logger', () => ({
          info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
        }));
        
        jest.doMock('bullmq', () => ({
          Queue: jest.fn().mockImplementation(() => ({
            add: mockQueueAdd,
            getJobCounts: mockGetJobCounts,
            close: mockQueueClose
          })),
          Worker: jest.fn()
        }));
        
        const freshModule = require('../../../src/modules/assets/assets.queue');
        
        const jobData = {
          assetId: '507f1f77bcf86cd799439011',
          userId: '507f1f77bcf86cd799439012',
          imageUrl: 'https://res.cloudinary.com/test/image/upload/test.jpg',
          category: 'sneaker',
          createdAt: '2025-12-28T10:30:00.000Z'
        };

        delete jobData[fieldToOmit];

        await expect(freshModule.addToProcessingQueue(jobData)).rejects.toThrow(
          `Missing required field: ${fieldToOmit}`
        );
      }
    });
  });

  /**
   * T019: Unit test - Queue addJob() uses correct job options
   */
  describe('Job Options', () => {
    it('should use correct job options (attempts:3, backoff, timeout:120000)', async () => {
      const jobData = {
        assetId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        imageUrl: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        category: 'sneaker',
        createdAt: '2025-12-28T10:30:00.000Z'
      };

      await addToProcessingQueue(jobData);

      const addCall = mockQueueAdd.mock.calls[0];
      const options = addCall[2];

      expect(options).toEqual({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        timeout: 120000,
        removeOnComplete: {
          age: 86400
        },
        removeOnFail: {
          age: 604800
        }
      });
    });

    it('should use exponential backoff with 2000ms base delay', async () => {
      const jobData = {
        assetId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        imageUrl: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        category: 'other',
        createdAt: '2025-12-28T10:30:00.000Z'
      };

      await addToProcessingQueue(jobData);

      const options = mockQueueAdd.mock.calls[0][2];

      expect(options.backoff.type).toBe('exponential');
      expect(options.backoff.delay).toBe(2000);
    });
  });

  describe('getQueueMetrics()', () => {
    it('should return queue job counts', async () => {
      const metrics = await getQueueMetrics();

      expect(metrics).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 0,
        paused: 0
      });
    });
  });
});
