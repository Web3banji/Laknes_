/**
 * LAKNES Standardized API Response Builders
 */

import { ApiResponse, PaginationMeta } from '../types/api.ts';
import { AppError } from './errors.ts';

export function buildSuccessResponse<T>(data: T, pagination?: PaginationMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      pagination,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}

export function buildErrorResponse(error: unknown): ApiResponse<never> {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  const err = error as Error;
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err?.message || 'An unexpected internal error occurred.',
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}
