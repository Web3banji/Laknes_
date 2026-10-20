/**
 * LAKNES Content Moderation Service
 * Handles user reports and admin moderation actions with target verification.
 */

import {
  ContentReport,
  EntityId,
  ContentReportStatus,
  ContentReportTargetType,
  AuditAction,
} from '../../types/contracts.ts';
import { SubmitContentReportRequest, PaginationParams } from '../../types/api.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { getRepositories, PaginatedResult } from '../../dal/index.ts';
import { assertAdmin } from '../auth/permissions.ts';
import { NotFoundError, ValidationError } from '../../core/errors.ts';
import { validateRequired, sanitizeString } from '../../shared/validation.ts';

export interface IModerationService {
  submitReport(reporter: SecurityUserContext, request: SubmitContentReportRequest): Promise<ContentReport>;
  getPendingReports(admin: SecurityUserContext, pagination?: PaginationParams): Promise<PaginatedResult<ContentReport>>;
  resolveReport(admin: SecurityUserContext, reportId: EntityId, status: ContentReportStatus): Promise<ContentReport>;
}

export class ModerationService implements IModerationService {
  async submitReport(
    reporter: SecurityUserContext,
    request: SubmitContentReportRequest
  ): Promise<ContentReport> {
    validateRequired(request.targetType, 'targetType');
    validateRequired(request.targetId, 'targetId');
    validateRequired(request.reason, 'reason');

    if (!Object.values(ContentReportTargetType).includes(request.targetType)) {
      throw new ValidationError(`Invalid targetType '${request.targetType}'. Supported: ${Object.values(ContentReportTargetType).join(', ')}`);
    }

    const repos = getRepositories();

    // Verify target exists
    if (request.targetType === ContentReportTargetType.PROJECT) {
      const p = await repos.projects.findById(request.targetId);
      if (!p) throw new NotFoundError('Target project', request.targetId);
    } else if (request.targetType === ContentReportTargetType.PROJECT_UPDATE) {
      const u = await repos.updates.findById(request.targetId);
      if (!u) throw new NotFoundError('Target update', request.targetId);
    } else if (request.targetType === ContentReportTargetType.QUEST) {
      const q = await repos.quests.findById(request.targetId);
      if (!q) throw new NotFoundError('Target quest', request.targetId);
    }

    const report = await repos.reports.create({
      reporterId: reporter.id,
      targetType: request.targetType,
      targetId: request.targetId,
      reason: sanitizeString(request.reason),
      reportStatus: ContentReportStatus.PENDING,
    });

    await repos.auditLogs.create({
      actorId: reporter.id,
      action: AuditAction.CONTENT_REPORT_SUBMITTED,
      targetType: 'CONTENT_REPORT',
      targetId: report.id,
      details: { targetType: request.targetType, targetId: request.targetId, reason: report.reason },
    });

    return report;
  }

  async getPendingReports(
    admin: SecurityUserContext,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ContentReport>> {
    assertAdmin(admin);
    const repos = getRepositories();
    return await repos.reports.findPending(pagination);
  }

  async resolveReport(
    admin: SecurityUserContext,
    reportId: EntityId,
    status: ContentReportStatus
  ): Promise<ContentReport> {
    assertAdmin(admin);

    if (status === ContentReportStatus.PENDING) {
      throw new ValidationError('A report must be resolved to INVESTIGATING, RESOLVED, or DISMISSED.');
    }

    const repos = getRepositories();
    const report = await repos.reports.findById(reportId);
    if (!report) {
      throw new NotFoundError('ContentReport', reportId);
    }

    const updated = await repos.reports.update(reportId, {
      reportStatus: status,
    });

    await repos.auditLogs.create({
      actorId: admin.id,
      action: AuditAction.CONTENT_MODERATED,
      targetType: 'CONTENT_REPORT',
      targetId: reportId,
      details: { previousStatus: report.reportStatus, newStatus: status },
    });

    return updated;
  }
}

export const moderationService = new ModerationService();
