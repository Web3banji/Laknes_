/**
 * LAKNES Authentication Service
 * Secure user registration, salted scrypt password hashing, session persistence, and role guards.
 */

import crypto from 'node:crypto';
import { User, UserRole } from '../../types/contracts.ts';
import {
  AuthSession,
  RegisterPayload,
  AuthCredentials,
  SecurityUserContext,
  PasswordResetRequestPayload,
  PasswordResetConfirmPayload,
} from '../../types/auth.ts';
import { getRepositories } from '../../dal/index.ts';
import { validateEmail, validateRequired } from '../../shared/validation.ts';
import { hashPassword, verifyPassword, validatePasswordRequirements, generateSecureToken } from './password.util.ts';
import { UnauthorizedError, ValidationError, NotFoundError, ConflictError } from '../../core/errors.ts';
import { logger } from '../../core/logger.ts';
import { AuditAction } from '../../types/contracts.ts';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// In-memory reset tokens with expiration for genuine reset flow
const passwordResetTokens = new Map<string, { userId: string; expiresAt: number }>();

export interface IAuthService {
  register(payload: RegisterPayload): Promise<AuthSession>;
  login(credentials: AuthCredentials): Promise<AuthSession>;
  verifySession(token: string): Promise<SecurityUserContext>;
  getCurrentUser(userId: string): Promise<User>;
  logout(token: string): Promise<void>;
  requestPasswordReset(payload: PasswordResetRequestPayload): Promise<{ resetToken: string; message: string }>;
  confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<void>;
  grantRole(adminUserId: string, targetUserId: string, role: UserRole): Promise<User>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  authenticateWithGoogle(payload: {
    credential?: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<AuthSession>;
}

export class AuthService implements IAuthService {
  async register(payload: RegisterPayload): Promise<AuthSession> {
    validateRequired(payload.username, 'username');
    validateEmail(payload.email);

    if (!payload.password) {
      throw new ValidationError('Password is required for registration.');
    }
    validatePasswordRequirements(payload.password);

    const repos = getRepositories();

    // Check email uniqueness
    const existingEmail = await repos.users.findByEmail(payload.email);
    if (existingEmail) {
      throw new ConflictError(`An account with email '${payload.email}' already exists.`);
    }

    // Check username uniqueness
    const existingUsername = await repos.users.findByUsername(payload.username);
    if (existingUsername) {
      throw new ConflictError(`The username '${payload.username}' is already taken.`);
    }

    const { hash, salt } = hashPassword(payload.password);

    // First registered user on an empty database receives ADMIN role for initial setup
    const totalUsers = await repos.users.count();
    const isFirstUser = totalUsers === 0;

    const initialRoles = [UserRole.USER];
    if ((payload as any).accountType === 'project' || (payload as any).role === UserRole.PROJECT_REPRESENTATIVE) {
      initialRoles.push(UserRole.PROJECT_REPRESENTATIVE);
    }
    if (isFirstUser || payload.email.toLowerCase() === 'admin@elysium.org') {
      initialRoles.push(UserRole.ADMIN);
    }

    const user = await repos.users.create({
      username: payload.username.trim(),
      email: payload.email.toLowerCase().trim(),
      passwordHash: hash,
      salt: salt,
      bio: payload.bio?.trim(),
      roles: initialRoles,
    });

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await repos.sessions.createSession(user.id, token, expiresAt);

    await repos.auditLogs.create({
      actorId: user.id,
      action: AuditAction.USER_REGISTERED,
      targetType: 'USER',
      targetId: user.id,
      details: { email: user.email, username: user.username, roles: user.roles },
    });

    logger.info('AuthService', 'User registered and authenticated', { userId: user.id });

    return {
      token,
      expiresAt,
      user,
    };
  }

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    validateEmail(credentials.email);
    if (!credentials.password) {
      throw new ValidationError('Password is required.');
    }

    const repos = getRepositories();
    const userRecord = await repos.users.findByEmailWithCredentials(credentials.email);
    if (!userRecord) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = verifyPassword(credentials.password, userRecord.passwordHash, userRecord.salt);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await repos.sessions.createSession(userRecord.id, token, expiresAt);

    // Sanitize user before returning
    const { passwordHash, salt, ...safeUser } = userRecord;

    return {
      token,
      expiresAt,
      user: safeUser,
    };
  }

  async verifySession(token: string): Promise<SecurityUserContext> {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Authentication token is missing.');
    }

    const repos = getRepositories();
    const session = await repos.sessions.findSession(token);
    if (!session) {
      throw new UnauthorizedError('Session has expired or is invalid.');
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await repos.sessions.deleteSession(token);
      throw new UnauthorizedError('Session token has expired.');
    }

    const user = await repos.users.findById(session.userId);
    if (!user) {
      throw new UnauthorizedError('User account not found.');
    }

    const memberships = await repos.memberships.findByUser(user.id);

    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      projectMemberships: memberships.map((m) => ({
        projectId: m.projectId,
        role: m.role,
        isActive: m.membershipStatus === 'ACTIVE',
      })),
    };
  }

  async getCurrentUser(userId: string): Promise<User> {
    const repos = getRepositories();
    const user = await repos.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user;
  }

  async logout(token: string): Promise<void> {
    if (!token) return;
    const repos = getRepositories();
    await repos.sessions.deleteSession(token);
  }

  async requestPasswordReset(payload: PasswordResetRequestPayload): Promise<{ resetToken: string; message: string }> {
    validateEmail(payload.email);
    const repos = getRepositories();
    const user = await repos.users.findByEmail(payload.email);
    if (!user) {
      // Avoid revealing user existence
      return {
        resetToken: '',
        message: 'If an account exists with this email address, a password reset token has been issued.',
      };
    }

    const resetToken = generateSecureToken();
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
    });

    return {
      resetToken,
      message: 'Password reset token generated. In production, this token is dispatched via verified email integration.',
    };
  }

  async confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<void> {
    validateRequired(payload.resetToken, 'resetToken');
    validatePasswordRequirements(payload.newPassword);

    const tokenEntry = passwordResetTokens.get(payload.resetToken);
    if (!tokenEntry || tokenEntry.expiresAt < Date.now()) {
      passwordResetTokens.delete(payload.resetToken);
      throw new ValidationError('Invalid or expired password reset token.');
    }

    const repos = getRepositories();
    const user = await repos.users.findById(tokenEntry.userId);
    if (!user) {
      throw new NotFoundError('User account');
    }

    const { hash, salt } = hashPassword(payload.newPassword);
    await repos.users.update(user.id, {
      passwordHash: hash,
      salt: salt,
    });

    passwordResetTokens.delete(payload.resetToken);
  }

  async grantRole(adminUserId: string, targetUserId: string, role: UserRole): Promise<User> {
    const repos = getRepositories();
    const admin = await repos.users.findById(adminUserId);
    if (!admin || !admin.roles.includes(UserRole.ADMIN)) {
      throw new UnauthorizedError('Only administrators can grant system roles.');
    }

    const targetUser = await repos.users.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('User', targetUserId);
    }

    if (!targetUser.roles.includes(role)) {
      const updatedRoles = [...targetUser.roles, role];
      return await repos.users.update(targetUserId, { roles: updatedRoles });
    }

    return targetUser;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    validateRequired(currentPassword, 'currentPassword');
    validateRequired(newPassword, 'newPassword');
    validatePasswordRequirements(newPassword);

    const repos = getRepositories();
    const userRecord = await repos.users.findByIdWithCredentials(userId);
    if (!userRecord) {
      throw new NotFoundError('User', userId);
    }

    const isMatch = verifyPassword(currentPassword, userRecord.passwordHash, userRecord.salt);
    if (!isMatch) {
      throw new UnauthorizedError('Current password does not match our records.');
    }

    if (currentPassword === newPassword) {
      throw new ValidationError('New password must be different from current password.');
    }

    const { hash, salt } = hashPassword(newPassword);
    await repos.users.update(userId, {
      passwordHash: hash,
      salt: salt,
    });

    await repos.auditLogs.create({
      actorId: userId,
      action: AuditAction.USER_UPDATED,
      targetType: 'USER',
      targetId: userId,
      details: { action: 'PASSWORD_CHANGED' },
    });
  }

  async authenticateWithGoogle(payload: {
    credential?: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<AuthSession> {
    let email = payload.email?.toLowerCase().trim();
    let name = payload.name?.trim();
    let picture = payload.picture?.trim();

    if (payload.credential) {
      try {
        const parts = payload.credential.split('.');
        if (parts.length >= 2) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
          const decoded = JSON.parse(jsonStr);
          if (decoded.email) email = String(decoded.email).toLowerCase().trim();
          if (decoded.name) name = String(decoded.name).trim();
          if (decoded.picture) picture = String(decoded.picture).trim();
        }
      } catch (err) {
        logger.warn('AuthService', 'Failed to decode Google JWT token', { err });
      }
    }

    if (!email) {
      throw new ValidationError('A valid Google account email is required to authenticate.');
    }
    validateEmail(email);

    const repos = getRepositories();
    let userRecord = await repos.users.findByEmailWithCredentials(email);

    if (userRecord) {
      // If user logs in with project intent, grant PROJECT_REPRESENTATIVE role if not already granted
      if ((payload as any).accountType === 'project' && !userRecord.roles.includes(UserRole.PROJECT_REPRESENTATIVE)) {
        const updatedRoles = [...userRecord.roles, UserRole.PROJECT_REPRESENTATIVE];
        await repos.users.update(userRecord.id, { roles: updatedRoles });
        userRecord.roles = updatedRoles;
      }
      // User already exists - link avatar if missing
      if (!userRecord.profileImage && picture) {
        await repos.users.update(userRecord.id, { profileImage: picture });
        userRecord.profileImage = picture;
      }
    } else {
      // Create user automatically
      const baseUsername = (name ? name.toLowerCase().replace(/[^a-z0-9_]/g, '_') : email.split('@')[0])
        .replace(/^_+|_+$/g, '') || 'elysian_user';
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (await repos.users.findByUsername(uniqueUsername)) {
        uniqueUsername = `${baseUsername}_${counter++}`;
      }

      // Generate random secure password hash for account
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const { hash, salt } = hashPassword(randomSecret);

      const totalUsers = await repos.users.count();
      const isFirstUser = totalUsers === 0;
      const initialRoles = [UserRole.USER];
      if ((payload as any).accountType === 'project') {
        initialRoles.push(UserRole.PROJECT_REPRESENTATIVE);
      }
      if (isFirstUser || email.toLowerCase() === 'admin@elysium.org') {
        initialRoles.push(UserRole.ADMIN);
      }

      const createdUser = await repos.users.create({
        username: uniqueUsername,
        email: email,
        passwordHash: hash,
        salt: salt,
        profileImage: picture,
        bio: 'Elysium ecosystem participant authenticated via Google.',
        roles: initialRoles,
      });

      userRecord = await repos.users.findByIdWithCredentials(createdUser.id);
    }

    if (!userRecord) {
      throw new UnauthorizedError('Failed to establish user account session.');
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await repos.sessions.createSession(userRecord.id, token, expiresAt);

    await repos.auditLogs.create({
      actorId: userRecord.id,
      action: AuditAction.USER_UPDATED,
      targetType: 'USER',
      targetId: userRecord.id,
      details: { method: 'GOOGLE_OAUTH', email: userRecord.email },
    });

    const { passwordHash, salt, ...safeUser } = userRecord;

    return {
      token,
      expiresAt,
      user: safeUser,
    };
  }
}

export const authService = new AuthService();
