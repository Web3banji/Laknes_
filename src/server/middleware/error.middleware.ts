/**
 * LAKNES Central Express Error Handler
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors.ts';
import { buildErrorResponse } from '../../core/response.ts';
import { logger } from '../../core/logger.ts';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  if (statusCode >= 500) {
    logger.error('ServerErrorHandler', `Unhandled or system error on ${req.method} ${req.url}: ${err.message}`, {
      stack: err.stack,
    });
  } else {
    logger.warn('ClientErrorHandler', `Client error on ${req.method} ${req.url}: ${err.message}`);
  }

  const payload = buildErrorResponse(err);
  res.status(statusCode).json(payload);
}
