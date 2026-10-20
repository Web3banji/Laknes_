/**
 * LAKNES Administrative Audit Service
 * Immutable tracking of system security events and state changes.
 */

import { AuditLog, EntityId, AuditAction } from '../../types/contracts.ts';
import { PaginationParams } from '../../types/api.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { getRepositories, PaginatedResult } from '../../dal/index.ts';
import { assertAdmin } from '../auth/permissions.ts';

export interface IAuditService {
  record(
    actorId: EntityId,
    action: AuditAction,
    targetType: string,
    targetId: EntityId,
    details?: Record<string, unknown>
  ): Promise<AuditLog>;
  getLogs(
    admin: SecurityUserContext,
    filters?: { actorId?: EntityId; targetType?: string; targetId?: EntityId },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;
}

export class AuditService implements IAuditService {
  async record(
    actorId: EntityId,
    action: AuditAction,
    targetType: string,
    targetId: EntityId,
    details?: Record<string, unknown>
  ): Promise<AuditLog> {
    const repos = getRepositories();
    return await repos.auditLogs.create({
      actorId,
      action,
      targetType,
      targetId,
      details,
    });
  }

  async getLogs(
    admin: SecurityUserContext,
    filters?: { actorId?: EntityId; targetType?: string; targetId?: EntityId },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AuditLog>> {
    assertAdmin(admin);
    const repos = getRepositories();
    return await repos.auditLogs.findMany(filters, pagination);
  }
}

export const auditService = new AuditService();
