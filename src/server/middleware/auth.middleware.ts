/**
 * LAKNES Server Authentication and Authorization Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../../modules/auth/auth.service.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { UnauthorizedError, ForbiddenError } from '../../core/errors.ts';
import { isAdmin } from '../../modules/auth/permissions.ts';

declare global {
  namespace Express {
    interface Request {
      user?: SecurityUserContext;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  try {
    const user = await authService.verifySession(token);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication token is required to access this endpoint.'));
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.'));
  }
  if (!isAdmin(req.user)) {
    return next(new ForbiddenError('Administrative authorization required.'));
  }
  next();
}
