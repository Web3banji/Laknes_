/**
 * LAKNES Engagement Service
 * Follow and save projects with database uniqueness enforcement and error guards.
 */

import { EntityId, ProjectFollow, SavedProject, Project } from '../../types/contracts.ts';
import { PaginationParams } from '../../types/api.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { getRepositories, PaginatedResult } from '../../dal/index.ts';
import { NotFoundError, ConflictError } from '../../core/errors.ts';

export interface IEngagementService {
  followProject(user: SecurityUserContext, projectId: EntityId): Promise<ProjectFollow>;
  unfollowProject(user: SecurityUserContext, projectId: EntityId): Promise<boolean>;
  getFollowedProjects(userId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<ProjectFollow & { project?: Project }>>;
  isFollowing(userId: EntityId, projectId: EntityId): Promise<boolean>;

  saveProject(user: SecurityUserContext, projectId: EntityId): Promise<SavedProject>;
  unsaveProject(user: SecurityUserContext, projectId: EntityId): Promise<boolean>;
  getSavedProjects(userId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<SavedProject & { project?: Project }>>;
  isSaved(userId: EntityId, projectId: EntityId): Promise<boolean>;
}

export class EngagementService implements IEngagementService {
  async followProject(user: SecurityUserContext, projectId: EntityId): Promise<ProjectFollow> {
    const repos = getRepositories();
    const project = await repos.projects.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const existing = await repos.follows.find(user.id, projectId);
    if (existing) {
      return existing; // idempotent, no duplicate
    }

    return await repos.follows.create(user.id, projectId);
  }

  async unfollowProject(user: SecurityUserContext, projectId: EntityId): Promise<boolean> {
    const repos = getRepositories();
    const existing = await repos.follows.find(user.id, projectId);
    if (!existing) {
      return true; // Already not following
    }
    return await repos.follows.delete(user.id, projectId);
  }

  async getFollowedProjects(userId: EntityId, pagination?: PaginationParams) {
    const repos = getRepositories();
    return await repos.follows.findByUser(userId, pagination);
  }

  async isFollowing(userId: EntityId, projectId: EntityId): Promise<boolean> {
    const repos = getRepositories();
    const follow = await repos.follows.find(userId, projectId);
    return Boolean(follow);
  }

  async saveProject(user: SecurityUserContext, projectId: EntityId): Promise<SavedProject> {
    const repos = getRepositories();
    const project = await repos.projects.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const existing = await repos.savedProjects.find(user.id, projectId);
    if (existing) {
      return existing; // idempotent, no duplicate
    }

    return await repos.savedProjects.create(user.id, projectId);
  }

  async unsaveProject(user: SecurityUserContext, projectId: EntityId): Promise<boolean> {
    const repos = getRepositories();
    const existing = await repos.savedProjects.find(user.id, projectId);
    if (!existing) {
      return true;
    }
    return await repos.savedProjects.delete(user.id, projectId);
  }

  async getSavedProjects(userId: EntityId, pagination?: PaginationParams) {
    const repos = getRepositories();
    return await repos.savedProjects.findByUser(userId, pagination);
  }

  async isSaved(userId: EntityId, projectId: EntityId): Promise<boolean> {
    const repos = getRepositories();
    const saved = await repos.savedProjects.find(userId, projectId);
    return Boolean(saved);
  }
}

export const engagementService = new EngagementService();
