/**
 * LAKNES Cryptographic & Password Security Utilities
 * Implements salted scrypt password hashing, constant-time verification, and token generation.
 */

import crypto from 'node:crypto';
import { ValidationError } from '../../core/errors.ts';

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const MIN_PASSWORD_LENGTH = 8;

export function validatePasswordRequirements(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  if (!hasLetter || !hasDigit) {
    throw new ValidationError('Password must contain at least one letter and one number.');
  }
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, storedSalt, KEY_LENGTH);
    const hashBuffer = Buffer.from(storedHash, 'hex');
    if (hashBuffer.length !== derived.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, derived);
  } catch {
    return false;
  }
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
