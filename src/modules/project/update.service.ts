/**
 * LAKNES Project Updates Service
 * Handles project announcements, editorial workflows, and publication states.
 */

import {
  ProjectUpdate,
  EntityId,
  PublicationStatus,
  MembershipRole,
  AuditAction,
  ProjectVerificationStatus,
} from '../../types/contracts.ts';
import { CreateProjectUpdateRequest, UpdateProjectUpdateRequest, PaginationParams } from '../../types/api.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { getRepositories, PaginatedResult } from '../../dal/index.ts';
import { assertCanManageProject } from '../auth/permissions.ts';
import { validateRequired, sanitizeString } from '../../shared/validation.ts';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors.ts';
import { nowISO } from '../../shared/datetime.ts';

export interface IProjectUpdateService {
  createUpdate(
    author: SecurityUserContext,
    projectId: EntityId,
    request: CreateProjectUpdateRequest
  ): Promise<ProjectUpdate>;
  editUpdate(
    author: SecurityUserContext,
    updateId: EntityId,
    request: UpdateProjectUpdateRequest
  ): Promise<ProjectUpdate>;
  getProjectUpdates(
    projectId: EntityId,
    pagination?: PaginationParams,
    includeNonPublished?: boolean
  ): Promise<PaginatedResult<ProjectUpdate>>;
  getUpdateById(updateId: EntityId): Promise<ProjectUpdate>;
  setPublicationStatus(
    author: SecurityUserContext,
    updateId: EntityId,
    status: PublicationStatus
  ): Promise<ProjectUpdate>;
}

export class ProjectUpdateService implements IProjectUpdateService {
  async createUpdate(
    author: SecurityUserContext,
    projectId: EntityId,
    request: CreateProjectUpdateRequest
  ): Promise<ProjectUpdate> {
    assertCanManageProject(author, projectId, MembershipRole.CONTRIBUTOR);
    validateRequired(request.title, 'title');
    validateRequired(request.content, 'content');

    const repos = getRepositories();
    const project = await repos.projects.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Projects that are not yet VERIFIED can only create DRAFT updates until verified
    let status = request.publicationStatus || PublicationStatus.PUBLISHED;
    if (project.verificationStatus !== ProjectVerificationStatus.VERIFIED && status === PublicationStatus.PUBLISHED) {
      status = PublicationStatus.DRAFT;
    }

    const update = await repos.updates.create({
      projectId,
      authorId: author.id,
      title: sanitizeString(request.title),
      content: sanitizeString(request.content),
      links: request.links || [],
      publicationStatus: status,
      publishedAt: status === PublicationStatus.PUBLISHED ? nowISO() : undefined,
    });

    await repos.auditLogs.create({
      actorId: author.id,
      action: AuditAction.UPDATE_CREATED,
      targetType: 'PROJECT_UPDATE',
      targetId: update.id,
      details: { projectId, title: update.title, status },
    });

    return update;
  }

  async editUpdate(
    author: SecurityUserContext,
    updateId: EntityId,
    request: UpdateProjectUpdateRequest
  ): Promise<ProjectUpdate> {
    const repos = getRepositories();
    const update = await repos.updates.findById(updateId);
    if (!update) {
      throw new NotFoundError('ProjectUpdate', updateId);
    }

    assertCanManageProject(author, update.projectId, MembershipRole.CONTRIBUTOR);

    const payload: Partial<ProjectUpdate> = {};
    if (request.title) payload.title = sanitizeString(request.title);
    if (request.content) payload.content = sanitizeString(request.content);
    if (request.links) payload.links = request.links;
    if (request.publicationStatus) {
      payload.publicationStatus = request.publicationStatus;
      if (request.publicationStatus === PublicationStatus.PUBLISHED && !update.publishedAt) {
        payload.publishedAt = nowISO();
      }
    }

    const updated = await repos.updates.update(updateId, payload);

    await repos.auditLogs.create({
      actorId: author.id,
      action: AuditAction.UPDATE_UPDATED,
      targetType: 'PROJECT_UPDATE',
      targetId: updateId,
      details: { updatedFields: Object.keys(request) },
    });

    return updated;
  }

  async getProjectUpdates(
    projectId: EntityId,
    pagination?: PaginationParams,
    includeNonPublished = false
  ): Promise<PaginatedResult<ProjectUpdate>> {
    const repos = getRepositories();
    return await repos.updates.findByProject(projectId, pagination, includeNonPublished);
  }

  async getUpdateById(updateId: EntityId): Promise<ProjectUpdate> {
    const repos = getRepositories();
    const update = await repos.updates.findById(updateId);
    if (!update) {
      throw new NotFoundError('ProjectUpdate', updateId);
    }
    return update;
  }

  async setPublicationStatus(
    author: SecurityUserContext,
    updateId: EntityId,
    status: PublicationStatus
  ): Promise<ProjectUpdate> {
    const repos = getRepositories();
    const update = await repos.updates.findById(updateId);
    if (!update) {
      throw new NotFoundError('ProjectUpdate', updateId);
    }

    assertCanManageProject(author, update.projectId, MembershipRole.MAINTAINER);

    const project = await repos.projects.findById(update.projectId);
    if (status === PublicationStatus.PUBLISHED && project?.verificationStatus !== ProjectVerificationStatus.VERIFIED) {
      throw new ValidationError('Updates can only be published for verified projects.');
    }

    const updated = await repos.updates.update(updateId, {
      publicationStatus: status,
      publishedAt: status === PublicationStatus.PUBLISHED ? (update.publishedAt || nowISO()) : update.publishedAt,
    });

    await repos.auditLogs.create({
      actorId: author.id,
      action: status === PublicationStatus.PUBLISHED ? AuditAction.UPDATE_PUBLISHED : AuditAction.UPDATE_UPDATED,
      targetType: 'PROJECT_UPDATE',
      targetId: updateId,
      details: { newStatus: status },
    });

    return updated;
  }
}

export const projectUpdateService = new ProjectUpdateService();
