/**
 * LAKNES Unconfigured Database Adapter
 * Explicitly signals to callers that persistent storage infrastructure has not yet been provisioned.
 * Prevents silent in-memory or localStorage fallbacks.
 */

import { IDatabaseAdapter, DatabaseStatus, DatabaseHealth } from './adapter.ts';
import {
  RepositoryRegistry,
  IUserRepository,
  IProjectRepository,
  IProjectMembershipRepository,
  IProjectUpdateRepository,
  IQuestRepository,
  IQuestParticipationRepository,
  IProjectFollowRepository,
  ISavedProjectRepository,
  IProjectReviewRepository,
  IContentReportRepository,
  IAuditLogRepository,
} from './repositories.ts';
import { ServiceUnconfiguredError } from '../core/errors.ts';

function createUnconfiguredError(operation: string): never {
  throw new ServiceUnconfiguredError(
    'Persistent Database',
    `Database operation '${operation}' cannot be completed because a persistent database (e.g. PostgreSQL via Cloud SQL or Firestore) is not yet configured.`,
    'Provision and configure DATABASE_URL or Firestore to enable persistent records.'
  );
}

export class UnconfiguredDatabaseAdapter implements IDatabaseAdapter {
  public readonly name = 'UnconfiguredDatabaseAdapter';
  public readonly status: DatabaseStatus = 'UNCONFIGURED';
  public readonly isPersistent = false;

  async connect(): Promise<void> {
    // No-op for unconfigured adapter
  }

  async disconnect(): Promise<void> {
    // No-op for unconfigured adapter
  }

  async checkHealth(): Promise<DatabaseHealth> {
    return {
      status: 'UNCONFIGURED',
      adapterName: this.name,
      isPersistent: false,
      message:
        'Awaiting persistent database configuration. Architecture and data contracts are active, but no storage backend is provisioned.',
    };
  }

  getRepositories(): RepositoryRegistry {
    const users: IUserRepository = {
      findById: () => createUnconfiguredError('users.findById'),
      findByIdWithCredentials: () => createUnconfiguredError('users.findByIdWithCredentials'),
      findByEmail: () => createUnconfiguredError('users.findByEmail'),
      findByEmailWithCredentials: () => createUnconfiguredError('users.findByEmailWithCredentials'),
      findByUsername: () => createUnconfiguredError('users.findByUsername'),
      create: () => createUnconfiguredError('users.create'),
      update: () => createUnconfiguredError('users.update'),
      delete: () => createUnconfiguredError('users.delete'),
      count: () => createUnconfiguredError('users.count'),
    };

    const projects: IProjectRepository = {
      findById: () => createUnconfiguredError('projects.findById'),
      findBySlug: () => createUnconfiguredError('projects.findBySlug'),
      findMany: () => createUnconfiguredError('projects.findMany'),
      create: () => createUnconfiguredError('projects.create'),
      update: () => createUnconfiguredError('projects.update'),
      count: () => createUnconfiguredError('projects.count'),
    };

    const memberships: IProjectMembershipRepository = {
      findById: () => createUnconfiguredError('memberships.findById'),
      findByUserAndProject: () => createUnconfiguredError('memberships.findByUserAndProject'),
      findByProject: () => createUnconfiguredError('memberships.findByProject'),
      findByUser: () => createUnconfiguredError('memberships.findByUser'),
      create: () => createUnconfiguredError('memberships.create'),
      update: () => createUnconfiguredError('memberships.update'),
      delete: () => createUnconfiguredError('memberships.delete'),
    };

    const updates: IProjectUpdateRepository = {
      findById: () => createUnconfiguredError('updates.findById'),
      findByProject: () => createUnconfiguredError('updates.findByProject'),
      create: () => createUnconfiguredError('updates.create'),
      update: () => createUnconfiguredError('updates.update'),
      delete: () => createUnconfiguredError('updates.delete'),
    };

    const quests: IQuestRepository = {
      findById: () => createUnconfiguredError('quests.findById'),
      findByProject: () => createUnconfiguredError('quests.findByProject'),
      findActive: () => createUnconfiguredError('quests.findActive'),
      create: () => createUnconfiguredError('quests.create'),
      update: () => createUnconfiguredError('quests.update'),
      delete: () => createUnconfiguredError('quests.delete'),
    };

    const questParticipations: IQuestParticipationRepository = {
      findById: () => createUnconfiguredError('questParticipations.findById'),
      findByUserAndQuest: () => createUnconfiguredError('questParticipations.findByUserAndQuest'),
      findByUser: () => createUnconfiguredError('questParticipations.findByUser'),
      findByQuest: () => createUnconfiguredError('questParticipations.findByQuest'),
      create: () => createUnconfiguredError('questParticipations.create'),
      update: () => createUnconfiguredError('questParticipations.update'),
    };

    const follows: IProjectFollowRepository = {
      find: () => createUnconfiguredError('follows.find'),
      findByUser: () => createUnconfiguredError('follows.findByUser'),
      countByProject: () => createUnconfiguredError('follows.countByProject'),
      create: () => createUnconfiguredError('follows.create'),
      delete: () => createUnconfiguredError('follows.delete'),
    };

    const savedProjects: ISavedProjectRepository = {
      find: () => createUnconfiguredError('savedProjects.find'),
      findByUser: () => createUnconfiguredError('savedProjects.findByUser'),
      countByProject: () => createUnconfiguredError('savedProjects.countByProject'),
      create: () => createUnconfiguredError('savedProjects.create'),
      delete: () => createUnconfiguredError('savedProjects.delete'),
    };

    const reviews: IProjectReviewRepository = {
      findById: () => createUnconfiguredError('reviews.findById'),
      findByProject: () => createUnconfiguredError('reviews.findByProject'),
      findPending: () => createUnconfiguredError('reviews.findPending'),
      create: () => createUnconfiguredError('reviews.create'),
    };

    const reports: IContentReportRepository = {
      findById: () => createUnconfiguredError('reports.findById'),
      findPending: () => createUnconfiguredError('reports.findPending'),
      create: () => createUnconfiguredError('reports.create'),
      update: () => createUnconfiguredError('reports.update'),
    };

    const auditLogs: IAuditLogRepository = {
      create: () => createUnconfiguredError('auditLogs.create'),
      findMany: () => createUnconfiguredError('auditLogs.findMany'),
    };

    const sessions = {
      createSession: () => createUnconfiguredError('sessions.createSession'),
      findSession: () => createUnconfiguredError('sessions.findSession'),
      deleteSession: () => createUnconfiguredError('sessions.deleteSession'),
      deleteExpiredSessions: () => createUnconfiguredError('sessions.deleteExpiredSessions'),
    };

    return {
      users,
      projects,
      memberships,
      updates,
      quests,
      questParticipations,
      follows,
      savedProjects,
      reviews,
      reports,
      auditLogs,
      sessions,
    };
  }
}
