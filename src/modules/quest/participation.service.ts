/**
 * LAKNES Quest Participation Service
 * Handles user enrollment, proof submissions, and verification workflows.
 */

import {
  QuestParticipation,
  EntityId,
  QuestParticipationStatus,
  QuestCompletionStatus,
  AuditAction,
} from '../../types/contracts.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { getRepositories } from '../../dal/index.ts';
import { assertCanVerifyQuest } from '../auth/permissions.ts';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors.ts';
import { nowISO } from '../../shared/datetime.ts';

export interface IQuestParticipationService {
  joinQuest(user: SecurityUserContext, questId: EntityId): Promise<QuestParticipation>;
  submitProof(user: SecurityUserContext, questId: EntityId, proof: string): Promise<QuestParticipation>;
  verifyCompletion(
    verifier: SecurityUserContext,
    participationId: EntityId,
    decision: 'APPROVE' | 'REJECT',
    verificationNotes?: string
  ): Promise<QuestParticipation>;
}

export class QuestParticipationService implements IQuestParticipationService {
  async joinQuest(user: SecurityUserContext, questId: EntityId): Promise<QuestParticipation> {
    const repos = getRepositories();

    const quest = await repos.quests.findById(questId);
    if (!quest) {
      throw new NotFoundError('Quest', questId);
    }

    if (quest.deadline && new Date(quest.deadline).getTime() < Date.now()) {
      throw new ValidationError('This quest has already passed its deadline.');
    }

    const existing = await repos.questParticipations.findByUserAndQuest(user.id, questId);
    if (existing) {
      throw new ConflictError('You have already enrolled in this quest.');
    }

    return await repos.questParticipations.create({
      questId,
      userId: user.id,
      participationStatus: QuestParticipationStatus.IN_PROGRESS,
      completionStatus: QuestCompletionStatus.NOT_SUBMITTED,
      verificationStatus: QuestCompletionStatus.NOT_SUBMITTED,
    });
  }

  async submitProof(user: SecurityUserContext, questId: EntityId, proof: string): Promise<QuestParticipation> {
    if (!proof || proof.trim() === '') {
      throw new ValidationError('Submission proof is required.');
    }

    const repos = getRepositories();

    let participation = await repos.questParticipations.findByUserAndQuest(user.id, questId);
    if (!participation) {
      // Auto-enroll if not already joined
      participation = await repos.questParticipations.create({
        questId,
        userId: user.id,
        participationStatus: QuestParticipationStatus.IN_PROGRESS,
        completionStatus: QuestCompletionStatus.NOT_SUBMITTED,
        verificationStatus: QuestCompletionStatus.NOT_SUBMITTED,
      });
    }

    if (participation.completionStatus === QuestCompletionStatus.VERIFIED) {
      throw new ConflictError('This quest participation has already been verified.');
    }

    return await repos.questParticipations.update(participation.id, {
      submissionProof: proof.trim(),
      participationStatus: QuestParticipationStatus.COMPLETED,
      completionStatus: QuestCompletionStatus.PENDING_VERIFICATION,
      verificationStatus: QuestCompletionStatus.PENDING_VERIFICATION,
      completedAt: nowISO(),
    });
  }

  async verifyCompletion(
    verifier: SecurityUserContext,
    participationId: EntityId,
    decision: 'APPROVE' | 'REJECT',
    _verificationNotes?: string
  ): Promise<QuestParticipation> {
    const repos = getRepositories();

    const participation = await repos.questParticipations.findById(participationId);
    if (!participation) {
      throw new NotFoundError('QuestParticipation', participationId);
    }

    const quest = await repos.quests.findById(participation.questId);
    if (!quest) {
      throw new NotFoundError('Quest', participation.questId);
    }

    // Enforce permission: only project maintainers/owners or platform admins can verify
    assertCanVerifyQuest(verifier, quest.projectId);

    const isApproved = decision === 'APPROVE';
    const updated = await repos.questParticipations.update(participation.id, {
      verificationStatus: isApproved
        ? QuestCompletionStatus.VERIFIED
        : QuestCompletionStatus.REJECTED,
      completionStatus: isApproved
        ? QuestCompletionStatus.VERIFIED
        : QuestCompletionStatus.REJECTED,
      verifiedBy: verifier.id,
    });

    await repos.auditLogs.create({
      actorId: verifier.id,
      action: AuditAction.QUEST_VERIFIED,
      targetType: 'QUEST_PARTICIPATION',
      targetId: participation.id,
      details: { decision, questId: quest.id, userId: participation.userId },
    });

    return updated;
  }
}

export const questParticipationService = new QuestParticipationService();
