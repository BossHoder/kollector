import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with handlers
// Using 'warn' instead of 'error' to allow passthrough for unhandled requests (blob URLs, etc.)
export const server = setupServer(...handlers);
