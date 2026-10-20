/**
 * LAKNES User Module Service
 * Handles user profiles, account settings, ownership rules, and activity history.
 */

import { User, PublicUserProfile, EntityId, UserRole } from '../../types/contracts.ts';
import { PaginationParams } from '../../types/api.ts';
import { getRepositories, PaginatedResult } from '../../dal/index.ts';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors.ts';
import { SecurityUserContext } from '../../types/auth.ts';
import { validateEmail, validateUrl, sanitizeString } from '../../shared/validation.ts';
import { AuditAction } from '../../types/contracts.ts';

import { SocialLinks } from '../../types/contracts.ts';

export interface UpdateUserProfileDto {
  username?: string;
  name?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  interests?: string[];
  xAccount?: string;
  socialLinks?: SocialLinks;
}

export interface IUserService {
  getPublicProfile(userId: EntityId): Promise<PublicUserProfile>;
  getPrivateProfile(actingUser: SecurityUserContext, targetUserId: EntityId): Promise<User>;
  updateProfile(actingUser: SecurityUserContext, targetUserId: EntityId, updates: UpdateUserProfileDto): Promise<User>;
  getUserFollows(userId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<unknown>>;
  getUserSavedProjects(userId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<unknown>>;
  getUserQuests(userId: EntityId, pagination?: PaginationParams): Promise<PaginatedResult<unknown>>;
}

export class UserService implements IUserService {
  async getPublicProfile(userId: EntityId): Promise<PublicUserProfile> {
    const repos = getRepositories();
    const user = await repos.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Strictly public information: id, username, profileImage, headerImage, bio, createdAt
    return {
      id: user.id,
      username: user.username,
      profileImage: user.profileImage,
      headerImage: user.headerImage,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }

  async getPrivateProfile(actingUser: SecurityUserContext, targetUserId: EntityId): Promise<User> {
    const isAdmin = actingUser.roles.includes(UserRole.ADMIN);
    if (actingUser.id !== targetUserId && !isAdmin) {
      throw new ForbiddenError('Private profile information can only be viewed by the account owner or an administrator.');
    }

    const repos = getRepositories();
    const user = await repos.users.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User', targetUserId);
    }
    return user;
  }

  async updateProfile(
    actingUser: SecurityUserContext,
    targetUserId: EntityId,
    updates: UpdateUserProfileDto
  ): Promise<User> {
    const isAdmin = actingUser.roles.includes(UserRole.ADMIN);
    // Enforce ownership: only the user themselves or an administrator can update
    if (actingUser.id !== targetUserId && !isAdmin) {
      throw new ForbiddenError('You can only update your own user profile.');
    }

    const repos = getRepositories();
    const existing = await repos.users.findById(targetUserId);
    if (!existing) {
      throw new NotFoundError('User', targetUserId);
    }

    const payload: Partial<User> = {};

    if (updates.username !== undefined) {
      const sanitized = sanitizeString(updates.username);
      if (sanitized.length < 3) {
        throw new ValidationError('Username must be at least 3 characters long.');
      }
      // Check collision
      const check = await repos.users.findByUsername(sanitized);
      if (check && check.id !== targetUserId) {
        throw new ValidationError(`The username '${sanitized}' is already in use.`);
      }
      payload.username = sanitized;
    }

    if (updates.email !== undefined) {
      validateEmail(updates.email);
      const normalized = updates.email.toLowerCase().trim();
      const check = await repos.users.findByEmail(normalized);
      if (check && check.id !== targetUserId) {
        throw new ValidationError(`The email '${normalized}' is already in use.`);
      }
      payload.email = normalized;
    }

    if (updates.profileImage !== undefined) {
      if (updates.profileImage) {
        validateUrl(updates.profileImage, 'profileImage');
      }
      payload.profileImage = updates.profileImage ? updates.profileImage.trim() : undefined;
    }

    if (updates.headerImage !== undefined) {
      if (updates.headerImage) {
        validateUrl(updates.headerImage, 'headerImage');
      }
      payload.headerImage = updates.headerImage ? updates.headerImage.trim() : undefined;
    }

    if (updates.bio !== undefined) {
      payload.bio = updates.bio ? sanitizeString(updates.bio).slice(0, 500) : undefined;
    }

    if (updates.name !== undefined) {
      payload.name = updates.name ? sanitizeString(updates.name).slice(0, 100) : undefined;
    }

    if (updates.interests !== undefined) {
      payload.interests = Array.isArray(updates.interests) ? updates.interests : [];
    }

    if (updates.xAccount !== undefined) {
      payload.xAccount = updates.xAccount ? sanitizeString(updates.xAccount).replace(/^@/, '') : undefined;
    }

    if (updates.socialLinks !== undefined) {
      payload.socialLinks = updates.socialLinks;
    }

    const updated = await repos.users.update(targetUserId, payload);

    await repos.auditLogs.create({
      actorId: actingUser.id,
      action: AuditAction.USER_UPDATED,
      targetType: 'USER',
      targetId: targetUserId,
      details: { updatedFields: Object.keys(updates) },
    });

    return updated;
  }

  async getUserFollows(userId: EntityId, pagination?: PaginationParams) {
    const repos = getRepositories();
    return await repos.follows.findByUser(userId, pagination);
  }

  async getUserSavedProjects(userId: EntityId, pagination?: PaginationParams) {
    const repos = getRepositories();
    return await repos.savedProjects.findByUser(userId, pagination);
  }

  async getUserQuests(userId: EntityId, pagination?: PaginationParams) {
    const repos = getRepositories();
    return await repos.questParticipations.findByUser(userId, pagination);
  }
}

export const userService = new UserService();
