import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: (req, print) => {
      // Ignore blob URLs and other non-API requests
      const url = new URL(req.url);
      if (
        url.protocol === 'blob:' ||
        url.pathname.startsWith('/node_modules/') ||
        !url.pathname.startsWith('/api/')
      ) {
        return;
      }
      print.warning();
    },
  });
});

// Reset handlers after each test for test isolation
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
