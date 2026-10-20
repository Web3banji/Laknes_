/**
 * LAKNES Quest Service
 * Handles quest creation, discovery, and lifecycle management.
 */

import {
  Quest,
  EntityId,
  PublicationStatus,
  MembershipRole,
  AuditAction,
} from '../../types/contracts.ts';
import { CreateQuestRequest, PaginationParams } from '../../types/api.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { getRepositories, PaginatedResult } from '../../dal/index.ts';
import { assertCanManageProject } from '../auth/permissions.ts';
import { NotFoundError, ValidationError } from '../../core/errors.ts';
import { validateRequired, sanitizeString } from '../../shared/validation.ts';
import { isValidISODate } from '../../shared/datetime.ts';

export interface IQuestService {
  createQuest(
    creator: SecurityUserContext,
    projectId: EntityId,
    request: CreateQuestRequest
  ): Promise<Quest>;
  getQuestById(id: EntityId): Promise<Quest>;
  getProjectQuests(projectId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<Quest>>;
  getActiveQuests(pagination?: PaginationParams): Promise<PaginatedResult<Quest>>;
}

export class QuestService implements IQuestService {
  async createQuest(
    creator: SecurityUserContext,
    projectId: EntityId,
    request: CreateQuestRequest
  ): Promise<Quest> {
    assertCanManageProject(creator, projectId, MembershipRole.MAINTAINER);

    validateRequired(request.title, 'title');
    validateRequired(request.description, 'description');
    validateRequired(request.instructions, 'instructions');
    validateRequired(request.questType, 'questType');
    validateRequired(request.startAt, 'startAt');
    validateRequired(request.completionCriteria, 'completionCriteria');
    validateRequired(request.rewardConfiguration, 'rewardConfiguration');

    if (!isValidISODate(request.startAt)) {
      throw new ValidationError('Field startAt must be a valid ISO 8601 date string.');
    }
    if (request.deadline && !isValidISODate(request.deadline)) {
      throw new ValidationError('Field deadline must be a valid ISO 8601 date string.');
    }

    const repos = getRepositories();

    // Verify project exists
    const project = await repos.projects.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const quest = await repos.quests.create({
      projectId,
      title: sanitizeString(request.title),
      description: sanitizeString(request.description),
      instructions: sanitizeString(request.instructions),
      questType: request.questType,
      eligibilityRules: request.eligibilityRules || {},
      completionCriteria: request.completionCriteria,
      startAt: request.startAt,
      deadline: request.deadline,
      rewardConfiguration: request.rewardConfiguration,
      publicationStatus: PublicationStatus.PUBLISHED,
    });

    await repos.auditLogs.create({
      actorId: creator.id,
      action: AuditAction.QUEST_CREATED,
      targetType: 'QUEST',
      targetId: quest.id,
      details: { projectId, title: quest.title },
    });

    return quest;
  }

  async getQuestById(id: EntityId): Promise<Quest> {
    const repos = getRepositories();
    const quest = await repos.quests.findById(id);
    if (!quest) {
      throw new NotFoundError('Quest', id);
    }
    return quest;
  }

  async getProjectQuests(projectIdOrSlug: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<Quest>> {
    const repos = getRepositories();
    let resolvedId = projectIdOrSlug;
    const projectBySlug = await repos.projects.findBySlug(projectIdOrSlug);
    if (projectBySlug) {
      resolvedId = projectBySlug.id;
    }
    return await repos.quests.findByProject(resolvedId, pagination);
  }

  async getActiveQuests(pagination?: PaginationParams): Promise<PaginatedResult<Quest>> {
    const repos = getRepositories();
    return await repos.quests.findActive(pagination);
  }
}

export const questService = new QuestService();
