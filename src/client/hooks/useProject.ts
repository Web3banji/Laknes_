/**
 * LAKNES Project Query & Mutation Hooks
 */

import { useCallback } from 'react';
import { Project, ProjectAnalytics, ProjectDashboardData } from '../../types/contracts.ts';
import {
  SubmitProjectRequest,
  UpdateProjectRequest,
  SubmitProjectCorrectionsRequest,
  ProjectSearchFilters,
  InviteMemberRequest,
} from '../../types/api.ts';
import { laknesClient } from '../api-client.ts';
import { useAsyncState } from './useAsyncState.ts';

export function useProjects(filters: ProjectSearchFilters = {}) {
  const fetcher = useCallback(() => laknesClient.discoverProjects(filters), [JSON.stringify(filters)]);
  return useAsyncState<Project[]>(fetcher);
}

export function useProject(idOrSlug: string, isSlug = false) {
  const fetcher = useCallback(() => {
    if (!idOrSlug) return Promise.resolve(null as unknown as Project);
    return isSlug ? laknesClient.getProjectBySlug(idOrSlug) : laknesClient.getProjectById(idOrSlug);
  }, [idOrSlug, isSlug]);

  return useAsyncState<Project>(fetcher, { immediate: Boolean(idOrSlug) });
}

export function useProjectDashboard(projectId: string) {
  const fetcher = useCallback(() => {
    if (!projectId) return Promise.resolve(null as unknown as ProjectDashboardData);
    return laknesClient.getProjectDashboard(projectId);
  }, [projectId]);

  return useAsyncState<ProjectDashboardData>(fetcher, { immediate: Boolean(projectId) });
}

export function useProjectAnalytics(projectId: string) {
  const fetcher = useCallback(() => {
    if (!projectId) return Promise.resolve(null as unknown as ProjectAnalytics);
    return laknesClient.getProjectAnalytics(projectId);
  }, [projectId]);

  return useAsyncState<ProjectAnalytics>(fetcher, { immediate: Boolean(projectId) });
}

export function useProjectMutations() {
  const submitProject = async (request: SubmitProjectRequest) => {
    return await laknesClient.submitProject(request);
  };

  const updateProject = async (id: string, request: UpdateProjectRequest) => {
    return await laknesClient.updateProject(id, request);
  };

  const submitCorrections = async (id: string, correctionsNotes: string, updatedFields?: UpdateProjectRequest) => {
    return await laknesClient.submitCorrections(id, correctionsNotes, updatedFields);
  };

  const inviteMember = async (id: string, request: InviteMemberRequest) => {
    return await laknesClient.inviteMember(id, request.userEmailOrUsername, request.role);
  };

  const removeMember = async (id: string, userId: string) => {
    return await laknesClient.removeMember(id, userId);
  };

  const followProject = async (id: string) => {
    return await laknesClient.followProject(id);
  };

  const unfollowProject = async (id: string) => {
    return await laknesClient.unfollowProject(id);
  };

  const saveProject = async (id: string) => {
    return await laknesClient.saveProject(id);
  };

  const unsaveProject = async (id: string) => {
    return await laknesClient.unsaveProject(id);
  };

  return {
    submitProject,
    updateProject,
    submitCorrections,
    inviteMember,
    removeMember,
    followProject,
    unfollowProject,
    saveProject,
    unsaveProject,
  };
}
