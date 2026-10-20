/**
 * LAKNES Data Access Layer Repository Interfaces
 * Strongly typed CRUD and query interfaces for all core data contracts.
 */

import {
  EntityId,
  User,
  UserRecord,
  Project,
  ProjectMembership,
  ProjectMemberWithUser,
  ProjectUpdate,
  Quest,
  QuestParticipation,
  ProjectFollow,
  SavedProject,
  ProjectReview,
  ContentReport,
  AuditLog,
  ProjectCategory,
  ProjectVerificationStatus,
} from '../types/contracts.ts';
import { PaginationParams, PaginationMeta } from '../types/api.ts';

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface IUserRepository {
  findById(id: EntityId): Promise<User | null>;
  findByIdWithCredentials(id: EntityId): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithCredentials(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<User | null>;
  create(userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: EntityId, updates: Partial<Omit<UserRecord, 'id' | 'createdAt'>>): Promise<User>;
  delete(id: EntityId): Promise<boolean>;
  count(): Promise<number>;
}

export interface ProjectQueryFilters extends PaginationParams {
  category?: ProjectCategory;
  verificationStatus?: ProjectVerificationStatus;
  ecosystem?: string;
  search?: string;
}

export interface IProjectRepository {
  findById(id: EntityId): Promise<Project | null>;
  findBySlug(slug: string): Promise<Project | null>;
  findMany(filters: ProjectQueryFilters): Promise<PaginatedResult<Project>>;
  create(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  update(id: EntityId, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project>;
  count(filters?: Partial<ProjectQueryFilters>): Promise<number>;
}

export interface IProjectMembershipRepository {
  findById(id: EntityId): Promise<ProjectMembership | null>;
  findByUserAndProject(userId: EntityId, projectId: EntityId): Promise<ProjectMembership | null>;
  findByProject(projectId: EntityId): Promise<ProjectMemberWithUser[]>;
  findByUser(userId: EntityId): Promise<ProjectMembership[]>;
  create(membership: Omit<ProjectMembership, 'id' | 'createdAt'>): Promise<ProjectMembership>;
  update(id: EntityId, updates: Partial<Omit<ProjectMembership, 'id' | 'createdAt'>>): Promise<ProjectMembership>;
  delete(id: EntityId): Promise<boolean>;
}

export interface IProjectUpdateRepository {
  findById(id: EntityId): Promise<ProjectUpdate | null>;
  findByProject(
    projectId: EntityId,
    pagination?: PaginationParams,
    includeNonPublished?: boolean
  ): Promise<PaginatedResult<ProjectUpdate>>;
  create(updateData: Omit<ProjectUpdate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectUpdate>;
  update(id: EntityId, updates: Partial<Omit<ProjectUpdate, 'id' | 'createdAt'>>): Promise<ProjectUpdate>;
  delete(id: EntityId): Promise<boolean>;
}

export interface IQuestRepository {
  findById(id: EntityId): Promise<Quest | null>;
  findByProject(projectId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<Quest>>;
  findActive(pagination?: PaginationParams): Promise<PaginatedResult<Quest>>;
  create(questData: Omit<Quest, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quest>;
  update(id: EntityId, updates: Partial<Omit<Quest, 'id' | 'createdAt'>>): Promise<Quest>;
  delete(id: EntityId): Promise<boolean>;
}

export interface IQuestParticipationRepository {
  findById(id: EntityId): Promise<QuestParticipation | null>;
  findByUserAndQuest(userId: EntityId, questId: EntityId): Promise<QuestParticipation | null>;
  findByUser(userId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<QuestParticipation>>;
  findByQuest(questId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<QuestParticipation>>;
  create(participation: Omit<QuestParticipation, 'id' | 'startedAt'>): Promise<QuestParticipation>;
  update(id: EntityId, updates: Partial<Omit<QuestParticipation, 'id' | 'startedAt'>>): Promise<QuestParticipation>;
}

export interface IProjectFollowRepository {
  find(userId: EntityId, projectId: EntityId): Promise<ProjectFollow | null>;
  findByUser(userId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<ProjectFollow & { project?: Project }>>;
  countByProject(projectId: EntityId): Promise<number>;
  create(userId: EntityId, projectId: EntityId): Promise<ProjectFollow>;
  delete(userId: EntityId, projectId: EntityId): Promise<boolean>;
}

export interface ISavedProjectRepository {
  find(userId: EntityId, projectId: EntityId): Promise<SavedProject | null>;
  findByUser(userId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<SavedProject & { project?: Project }>>;
  countByProject(projectId: EntityId): Promise<number>;
  create(userId: EntityId, projectId: EntityId): Promise<SavedProject>;
  delete(userId: EntityId, projectId: EntityId): Promise<boolean>;
}

export interface IProjectReviewRepository {
  findById(id: EntityId): Promise<ProjectReview | null>;
  findByProject(projectId: EntityId): Promise<ProjectReview[]>;
  findPending(pagination?: PaginationParams): Promise<PaginatedResult<ProjectReview & { project?: Project }>>;
  create(reviewData: Omit<ProjectReview, 'id' | 'createdAt'>): Promise<ProjectReview>;
}

export interface IContentReportRepository {
  findById(id: EntityId): Promise<ContentReport | null>;
  findPending(pagination?: PaginationParams): Promise<PaginatedResult<ContentReport>>;
  create(reportData: Omit<ContentReport, 'id' | 'createdAt'>): Promise<ContentReport>;
  update(id: EntityId, updates: Partial<Omit<ContentReport, 'id' | 'createdAt'>>): Promise<ContentReport>;
}

export interface IAuditLogRepository {
  create(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
  findMany(
    filters?: { actorId?: EntityId; targetType?: string; targetId?: EntityId },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;
}

export interface ISessionRepository {
  createSession(userId: EntityId, token: string, expiresAt: string): Promise<void>;
  findSession(token: string): Promise<{ userId: EntityId; token: string; expiresAt: string } | null>;
  deleteSession(token: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
}

export interface RepositoryRegistry {
  users: IUserRepository;
  projects: IProjectRepository;
  memberships: IProjectMembershipRepository;
  updates: IProjectUpdateRepository;
  quests: IQuestRepository;
  questParticipations: IQuestParticipationRepository;
  follows: IProjectFollowRepository;
  savedProjects: ISavedProjectRepository;
  reviews: IProjectReviewRepository;
  reports: IContentReportRepository;
  auditLogs: IAuditLogRepository;
  sessions: ISessionRepository;
}
