/**
 * LAKNES Server Application Instance
 * Central Express configuration for API endpoints.
 */

import express from 'express';
import { apiRouter } from './routes/index.ts';
import { authenticate } from './middleware/auth.middleware.ts';
import { errorHandler } from './middleware/error.middleware.ts';

export function createApiApp() {
  const app = express();

  // Standard middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global Auth Context Middleware
  app.use(authenticate);

  // Mount API Router under /api
  app.use('/api', apiRouter);

  // Central error handling
  app.use(errorHandler);

  return app;
}

export const apiApp = createApiApp();
