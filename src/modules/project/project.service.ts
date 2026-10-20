/**
 * LAKNES Project Module Service
 * Handles discovery, submissions, representative management, corrections, and dashboard analytics.
 */

import {
  Project,
  ProjectMembership,
  ProjectMemberWithUser,
  ProjectAnalytics,
  ProjectDashboardData,
  EntityId,
  ProjectVerificationStatus,
  MembershipRole,
  MembershipStatus,
  AuditAction,
  UserRole,
  PublicationStatus,
} from '../../types/contracts.ts';
import {
  SubmitProjectRequest,
  UpdateProjectRequest,
  SubmitProjectCorrectionsRequest,
  ProjectSearchFilters,
  InviteMemberRequest,
} from '../../types/api.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { getRepositories, PaginatedResult } from '../../dal/index.ts';
import { assertCanManageProject } from '../auth/permissions.ts';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../core/errors.ts';
import { validateRequired, validateSlug, validateUrl, sanitizeString } from '../../shared/validation.ts';
import { nowISO } from '../../shared/datetime.ts';

export interface IProjectService {
  discoverProjects(filters: ProjectSearchFilters): Promise<PaginatedResult<Project>>;
  getProjectById(id: EntityId): Promise<Project>;
  getProjectBySlug(slug: string): Promise<Project>;
  submitProject(creator: SecurityUserContext, request: SubmitProjectRequest): Promise<Project>;
  updateProject(actingUser: SecurityUserContext, projectId: EntityId, request: UpdateProjectRequest): Promise<Project>;
  submitCorrections(actingUser: SecurityUserContext, projectId: EntityId, request: SubmitProjectCorrectionsRequest): Promise<Project>;
  getProjectDashboard(actingUser: SecurityUserContext, projectId: EntityId): Promise<ProjectDashboardData>;
  getProjectMembers(projectId: EntityId): Promise<ProjectMemberWithUser[]>;
  inviteMember(actingUser: SecurityUserContext, projectId: EntityId, request: InviteMemberRequest): Promise<ProjectMembership>;
  removeMember(actingUser: SecurityUserContext, projectId: EntityId, targetUserId: EntityId): Promise<boolean>;
  getProjectAnalytics(projectId: EntityId): Promise<ProjectAnalytics>;
}

export class ProjectService implements IProjectService {
  /**
   * Public discovery endpoint: strictly returns VERIFIED projects unless administrative filter is requested
   */
  async discoverProjects(filters: ProjectSearchFilters): Promise<PaginatedResult<Project>> {
    const repos = getRepositories();

    // Default to VERIFIED projects so unapproved/pending/rejected projects are not visible to the public
    const status = filters.verificationStatus || ProjectVerificationStatus.VERIFIED;

    return await repos.projects.findMany({
      category: filters.category,
      verificationStatus: status,
      ecosystem: filters.ecosystem,
      search: filters.query,
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  }

  async getProjectById(id: EntityId): Promise<Project> {
    const repos = getRepositories();
    const project = await repos.projects.findById(id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    return project;
  }

  async getProjectBySlug(slug: string): Promise<Project> {
    const repos = getRepositories();
    const project = await repos.projects.findBySlug(slug);
    if (!project) {
      throw new NotFoundError(`Project with slug '${slug}'`);
    }
    return project;
  }

  async submitProject(creator: SecurityUserContext, request: SubmitProjectRequest): Promise<Project> {
    validateRequired(request.name, 'name');
    validateRequired(request.shortDescription, 'shortDescription');
    validateRequired(request.description, 'description');
    validateRequired(request.category, 'category');
    validateRequired(request.websiteUrl, 'websiteUrl');
    validateUrl(request.websiteUrl, 'websiteUrl');
    if (request.documentationUrl) validateUrl(request.documentationUrl, 'documentationUrl');
    if (request.logoUrl) validateUrl(request.logoUrl, 'logoUrl');
    validateSlug(request.slug);

    const repos = getRepositories();

    // Check slug uniqueness
    const existing = await repos.projects.findBySlug(request.slug);
    if (existing) {
      throw new ConflictError(`A project with slug '${request.slug}' already exists.`);
    }

    // New submissions enter PENDING_REVIEW status. Submitter cannot approve or self-verify
    const project = await repos.projects.create({
      name: sanitizeString(request.name),
      slug: request.slug.toLowerCase().trim(),
      logoUrl: request.logoUrl,
      bannerUrl: request.bannerUrl,
      shortDescription: sanitizeString(request.shortDescription),
      description: sanitizeString(request.description),
      category: request.category,
      websiteUrl: request.websiteUrl.trim(),
      documentationUrl: request.documentationUrl ? request.documentationUrl.trim() : undefined,
      socialLinks: request.socialLinks || {},
      contractAddresses: request.contractAddresses || [],
      representativeInfo: request.representativeInfo || {
        name: creator.email,
        role: 'Submitter',
        email: creator.email,
      },
      supportingInfo: request.supportingInfo ? sanitizeString(request.supportingInfo) : undefined,
      ecosystem: request.ecosystem || 'Elysium',
      verificationStatus: ProjectVerificationStatus.PENDING_REVIEW,
    });

    // Establish submitter as OWNER in memberships
    await repos.memberships.create({
      userId: creator.id,
      projectId: project.id,
      role: MembershipRole.OWNER,
      membershipStatus: MembershipStatus.ACTIVE,
    });

    // Log administrative audit event
    await repos.auditLogs.create({
      actorId: creator.id,
      action: AuditAction.PROJECT_SUBMITTED,
      targetType: 'PROJECT',
      targetId: project.id,
      details: { name: project.name, slug: project.slug, status: ProjectVerificationStatus.PENDING_REVIEW },
    });

    return project;
  }

  async updateProject(
    actingUser: SecurityUserContext,
    projectId: EntityId,
    request: UpdateProjectRequest
  ): Promise<Project> {
    assertCanManageProject(actingUser, projectId, MembershipRole.MAINTAINER);

    if (request.websiteUrl) validateUrl(request.websiteUrl, 'websiteUrl');
    if (request.documentationUrl) validateUrl(request.documentationUrl, 'documentationUrl');
    if (request.logoUrl) validateUrl(request.logoUrl, 'logoUrl');

    const repos = getRepositories();
    const existing = await this.getProjectById(projectId);

    // Representatives cannot update verificationStatus directly
    const payload: Partial<Project> = {
      name: request.name ? sanitizeString(request.name) : undefined,
      shortDescription: request.shortDescription ? sanitizeString(request.shortDescription) : undefined,
      description: request.description ? sanitizeString(request.description) : undefined,
      category: request.category,
      websiteUrl: request.websiteUrl ? request.websiteUrl.trim() : undefined,
      documentationUrl: request.documentationUrl ? request.documentationUrl.trim() : undefined,
      logoUrl: request.logoUrl,
      bannerUrl: request.bannerUrl,
      socialLinks: request.socialLinks ? request.socialLinks : undefined,
      contractAddresses: request.contractAddresses ? request.contractAddresses : undefined,
      supportingInfo: request.supportingInfo ? sanitizeString(request.supportingInfo) : undefined,
    };

    // Rule: If a verified project modifies core identification (name, websiteUrl), require renewed review
    const criticalFieldsChanged =
      (request.name && request.name !== existing.name) ||
      (request.websiteUrl && request.websiteUrl !== existing.websiteUrl);

    if (existing.verificationStatus === ProjectVerificationStatus.VERIFIED && criticalFieldsChanged) {
      payload.verificationStatus = ProjectVerificationStatus.PENDING_REVIEW;
    }

    const updated = await repos.projects.update(projectId, payload);

    await repos.auditLogs.create({
      actorId: actingUser.id,
      action: AuditAction.PROJECT_UPDATED,
      targetType: 'PROJECT',
      targetId: projectId,
      details: {
        updatedFields: Object.keys(request),
        renewedReviewRequired: payload.verificationStatus === ProjectVerificationStatus.PENDING_REVIEW,
      },
    });

    return updated;
  }

  async submitCorrections(
    actingUser: SecurityUserContext,
    projectId: EntityId,
    request: SubmitProjectCorrectionsRequest
  ): Promise<Project> {
    assertCanManageProject(actingUser, projectId, MembershipRole.MAINTAINER);
    validateRequired(request.correctionsNotes, 'correctionsNotes');

    const repos = getRepositories();
    const project = await this.getProjectById(projectId);

    if (project.verificationStatus !== ProjectVerificationStatus.CHANGES_REQUESTED) {
      throw new ValidationError(
        `Corrections can only be submitted for projects in '${ProjectVerificationStatus.CHANGES_REQUESTED}' status. Current status: ${project.verificationStatus}.`
      );
    }

    // Apply any updated fields
    if (request.updatedFields) {
      await this.updateProject(actingUser, projectId, request.updatedFields);
    }

    // Transition back to PENDING_REVIEW
    const updated = await repos.projects.update(projectId, {
      verificationStatus: ProjectVerificationStatus.PENDING_REVIEW,
      supportingInfo: project.supportingInfo
        ? `${project.supportingInfo}\n\n[Corrections Submitted]: ${request.correctionsNotes}`
        : `[Corrections Submitted]: ${request.correctionsNotes}`,
    });

    await repos.auditLogs.create({
      actorId: actingUser.id,
      action: AuditAction.PROJECT_CORRECTIONS_SUBMITTED,
      targetType: 'PROJECT',
      targetId: projectId,
      details: { notes: request.correctionsNotes },
    });

    return updated;
  }

  async getProjectDashboard(actingUser: SecurityUserContext, projectId: EntityId): Promise<ProjectDashboardData> {
    const repos = getRepositories();
    const project = await this.getProjectById(projectId);

    // Verify authorized membership or admin
    const membership = await repos.memberships.findByUserAndProject(actingUser.id, projectId);
    const isAdmin = actingUser.roles.includes(UserRole.ADMIN);

    if (!membership && !isAdmin) {
      throw new ForbiddenError('You do not have representative access to this project dashboard.');
    }

    const [members, updatesResult, questsResult, reviews, analytics] = await Promise.all([
      repos.memberships.findByProject(projectId),
      repos.updates.findByProject(projectId, { limit: 10 }, true), // include drafts/pending for dashboard
      repos.quests.findByProject(projectId, { limit: 10 }),
      repos.reviews.findByProject(projectId),
      this.getProjectAnalytics(projectId),
    ]);

    return {
      project,
      userRole: membership ? membership.role : MembershipRole.OWNER,
      members,
      recentUpdates: updatesResult.items,
      quests: questsResult.items,
      analytics,
      latestReview: reviews[0] || undefined,
      reviewHistory: reviews,
    };
  }

  async getProjectMembers(projectId: EntityId): Promise<ProjectMemberWithUser[]> {
    const repos = getRepositories();
    return await repos.memberships.findByProject(projectId);
  }

  async inviteMember(
    actingUser: SecurityUserContext,
    projectId: EntityId,
    request: InviteMemberRequest
  ): Promise<ProjectMembership> {
    // Only OWNER can invite or add members
    assertCanManageProject(actingUser, projectId, MembershipRole.OWNER);
    validateRequired(request.userEmailOrUsername, 'userEmailOrUsername');
    validateRequired(request.role, 'role');

    const repos = getRepositories();
    const targetUser =
      (await repos.users.findByEmail(request.userEmailOrUsername)) ||
      (await repos.users.findByUsername(request.userEmailOrUsername));

    if (!targetUser) {
      throw new NotFoundError(`User with identifier '${request.userEmailOrUsername}'`);
    }

    const existing = await repos.memberships.findByUserAndProject(targetUser.id, projectId);
    if (existing) {
      throw new ConflictError('This user is already a member of this project.');
    }

    const membership = await repos.memberships.create({
      userId: targetUser.id,
      projectId,
      role: request.role,
      membershipStatus: MembershipStatus.ACTIVE,
    });

    await repos.auditLogs.create({
      actorId: actingUser.id,
      action: AuditAction.MEMBERSHIP_GRANTED,
      targetType: 'PROJECT_MEMBERSHIP',
      targetId: membership.id,
      details: { projectId, userId: targetUser.id, role: request.role },
    });

    return membership;
  }

  async removeMember(
    actingUser: SecurityUserContext,
    projectId: EntityId,
    targetUserId: EntityId
  ): Promise<boolean> {
    assertCanManageProject(actingUser, projectId, MembershipRole.OWNER);

    if (actingUser.id === targetUserId) {
      throw new ValidationError('Project owners cannot remove themselves from their project membership.');
    }

    const repos = getRepositories();
    const membership = await repos.memberships.findByUserAndProject(targetUserId, projectId);
    if (!membership) {
      throw new NotFoundError('ProjectMembership');
    }

    await repos.memberships.delete(membership.id);

    await repos.auditLogs.create({
      actorId: actingUser.id,
      action: AuditAction.MEMBERSHIP_REVOKED,
      targetType: 'PROJECT_MEMBERSHIP',
      targetId: membership.id,
      details: { projectId, removedUserId: targetUserId },
    });

    return true;
  }

  async getProjectAnalytics(projectId: EntityId): Promise<ProjectAnalytics> {
    const repos = getRepositories();
    const project = await this.getProjectById(projectId);

    const [followerCount, savedCount, questsResult, updatesResult] = await Promise.all([
      repos.follows.countByProject(projectId),
      repos.savedProjects.countByProject(projectId),
      repos.quests.findByProject(projectId, { limit: 100 }),
      repos.updates.findByProject(projectId, { limit: 100 }, false),
    ]);

    const activeQuests = questsResult.items.filter(
      (q) => q.publicationStatus === PublicationStatus.PUBLISHED && (!q.deadline || new Date(q.deadline).getTime() > Date.now())
    ).length;

    return {
      projectId: project.id,
      followerCount,
      savedCount,
      totalQuests: questsResult.meta.totalItems,
      activeQuests,
      totalParticipants: 0,
      completedQuests: 0,
      updatesCount: updatesResult.meta.totalItems,
      lastUpdatedAt: nowISO(),
    };
  }
}

export const projectService = new ProjectService();
