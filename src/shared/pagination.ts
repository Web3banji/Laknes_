/**
 * LAKNES Pagination Utilities
 */

import { PaginationParams, PaginationMeta } from '../types/api.ts';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function sanitizePagination(params?: PaginationParams): {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
} {
  const page = Math.max(1, Number(params?.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params?.limit) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;
  const sortOrder = params?.sortOrder === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    offset,
    sortBy: params?.sortBy,
    sortOrder,
  };
}

export function buildPaginationMeta(totalItems: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
