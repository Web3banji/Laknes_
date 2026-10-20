/**
 * LAKNES Input Validation Utilities
 * Secure validation logic for API requests and business services.
 */

import { ValidationError } from '../core/errors.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_REGEX = /^https?:\/\/.+/i;

export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(`Field '${fieldName}' is required.`);
  }
}

export function validateEmail(email: string): void {
  validateRequired(email, 'email');
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(`Invalid email address format: '${email}'.`);
  }
}

export function validateSlug(slug: string): void {
  validateRequired(slug, 'slug');
  if (!SLUG_REGEX.test(slug)) {
    throw new ValidationError(
      `Invalid slug format: '${slug}'. Slugs must contain only lowercase alphanumeric characters and hyphens.`
    );
  }
}

export function validateUrl(url: string, fieldName = 'URL'): void {
  if (!url) return;
  if (!URL_REGEX.test(url)) {
    throw new ValidationError(`Invalid URL for ${fieldName}: '${url}'. Must start with http:// or https://.`);
  }
}

export function sanitizeString(input: string): string {
  if (!input) return '';
  return input.trim();
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
