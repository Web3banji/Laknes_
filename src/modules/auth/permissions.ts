/**
 * LAKNES Authorization and Permissions Matrix
 * Server-authoritative role verification and project boundary enforcement.
 */

import {
  UserRole,
  MembershipRole,
  MembershipStatus,
} from '../../types/contracts.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { ForbiddenError, UnauthorizedError } from '../../core/errors.ts';

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  [MembershipRole.CONTRIBUTOR]: 1,
  [MembershipRole.MAINTAINER]: 2,
  [MembershipRole.OWNER]: 3,
};

export function assertAuthenticated(user?: SecurityUserContext | null): asserts user is SecurityUserContext {
  if (!user || !user.id) {
    throw new UnauthorizedError('Authentication is required to perform this action.');
  }
}

export function hasGlobalRole(user: SecurityUserContext, role: UserRole): boolean {
  return user.roles.includes(role);
}

export function isAdmin(user: SecurityUserContext): boolean {
  return hasGlobalRole(user, UserRole.ADMIN);
}

export function assertAdmin(user: SecurityUserContext): void {
  assertAuthenticated(user);
  if (!isAdmin(user)) {
    throw new ForbiddenError('Administrative authorization is required.');
  }
}

export function getProjectMembership(user: SecurityUserContext, projectId: string) {
  return user.projectMemberships.find((m) => m.projectId === projectId && m.isActive);
}

export function isProjectMember(
  user: SecurityUserContext,
  projectId: string,
  minimumRole: MembershipRole = MembershipRole.CONTRIBUTOR
): boolean {
  if (isAdmin(user)) return true;

  const membership = getProjectMembership(user, projectId);
  if (!membership) return false;

  const userRoleWeight = ROLE_HIERARCHY[membership.role] || 0;
  const requiredWeight = ROLE_HIERARCHY[minimumRole] || 1;

  return userRoleWeight >= requiredWeight;
}

export function assertCanManageProject(
  user: SecurityUserContext,
  projectId: string,
  minimumRole: MembershipRole = MembershipRole.MAINTAINER
): void {
  assertAuthenticated(user);
  if (!isProjectMember(user, projectId, minimumRole)) {
    throw new ForbiddenError(
      `Access denied: You do not have sufficient permissions to manage project '${projectId}'.`
    );
  }
}

export function assertCanVerifyQuest(
  user: SecurityUserContext,
  projectId: string
): void {
  assertAuthenticated(user);
  // Only maintainers, owners, or admins can verify quest submissions
  if (!isProjectMember(user, projectId, MembershipRole.MAINTAINER)) {
    throw new ForbiddenError('Only project maintainers or administrators can verify quest completions.');
  }
}
