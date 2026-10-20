/**
 * LAKNES Quest Query & Mutation Hooks
 */

import { useCallback } from 'react';
import { Quest } from '../../types/contracts.ts';
import { CreateQuestRequest } from '../../types/api.ts';
import { laknesClient } from '../api-client.ts';
import { useAsyncState } from './useAsyncState.ts';

export function useQuests() {
  const fetcher = useCallback(() => laknesClient.getActiveQuests(), []);
  return useAsyncState<Quest[]>(fetcher);
}

export function useProjectQuests(projectId: string) {
  const fetcher = useCallback(() => {
    if (!projectId) return Promise.resolve([]);
    return laknesClient.getProjectQuests(projectId);
  }, [projectId]);

  return useAsyncState<Quest[]>(fetcher, { immediate: Boolean(projectId) });
}

export function useQuest(id: string) {
  const fetcher = useCallback(() => {
    if (!id) return Promise.resolve(null as unknown as Quest);
    return laknesClient.getQuestById(id);
  }, [id]);

  return useAsyncState<Quest>(fetcher, { immediate: Boolean(id) });
}

export function useQuestMutations() {
  const createQuest = async (projectId: string, request: CreateQuestRequest) => {
    return await laknesClient.createQuest(projectId, request);
  };

  const joinQuest = async (questId: string) => {
    return await laknesClient.joinQuest(questId);
  };

  const submitProof = async (questId: string, proof: string) => {
    return await laknesClient.submitQuestProof(questId, proof);
  };

  const verifyQuest = async (
    questId: string,
    decision: 'APPROVE' | 'REJECT',
    verificationNotes?: string
  ) => {
    return await laknesClient.verifyQuest(questId, decision, verificationNotes);
  };

  return {
    createQuest,
    joinQuest,
    submitProof,
    verifyQuest,
  };
}
