/**
 * LAKNES Authentication & Authorization Contracts
 * Role-Based Access Control and Permission Specifications.
 */

import { EntityId, UserRole, MembershipRole, User } from './contracts.ts';

export interface AuthCredentials {
  email: string;
  password?: string;
  authToken?: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password?: string;
  bio?: string;
}

export interface PasswordResetRequestPayload {
  email: string;
}

export interface PasswordResetConfirmPayload {
  resetToken: string;
  newPassword: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: User;
}

export interface AuthTokenPayload {
  userId: EntityId;
  email: string;
  roles: UserRole[];
  iat: number;
  exp: number;
}

/**
 * Project permission matrix for PROJECT_MEMBER roles
 */
export interface ProjectAccessContext {
  projectId: EntityId;
  role: MembershipRole;
  isActive: boolean;
}

export interface SecurityUserContext {
  id: EntityId;
  email: string;
  roles: UserRole[];
  projectMemberships: ProjectAccessContext[];
}

/**
 * Granular platform permissions
 */
export enum Permission {
  // User permissions
  MANAGE_OWN_PROFILE = 'MANAGE_OWN_PROFILE',
  PARTICIPATE_IN_QUEST = 'PARTICIPATE_IN_QUEST',
  FOLLOW_PROJECT = 'FOLLOW_PROJECT',
  SAVE_PROJECT = 'SAVE_PROJECT',
  SUBMIT_CONTENT_REPORT = 'SUBMIT_CONTENT_REPORT',

  // Project management permissions
  SUBMIT_PROJECT = 'SUBMIT_PROJECT',
  UPDATE_PROJECT_PROFILE = 'UPDATE_PROJECT_PROFILE',
  MANAGE_PROJECT_MEMBERS = 'MANAGE_PROJECT_MEMBERS',
  PUBLISH_PROJECT_UPDATE = 'PUBLISH_PROJECT_UPDATE',
  CREATE_PROJECT_QUEST = 'CREATE_PROJECT_QUEST',
  VERIFY_QUEST_COMPLETION = 'VERIFY_QUEST_COMPLETION',
  VIEW_PROJECT_ANALYTICS = 'VIEW_PROJECT_ANALYTICS',

  // Admin permissions
  REVIEW_PROJECT_SUBMISSIONS = 'REVIEW_PROJECT_SUBMISSIONS',
  MODERATE_CONTENT = 'MODERATE_CONTENT',
  RESOLVE_REPORTS = 'RESOLVE_REPORTS',
  ACCESS_AUDIT_LOGS = 'ACCESS_AUDIT_LOGS',
  MANAGE_GLOBAL_SETTINGS = 'MANAGE_GLOBAL_SETTINGS',
}
