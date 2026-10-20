/**
 * LAKNES Date & Time Utilities
 */

import { ISODateString } from '../types/contracts.ts';

export function nowISO(): ISODateString {
  return new Date().toISOString();
}

export function isValidISODate(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function isPast(dateStr: ISODateString): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

export function isFuture(dateStr: ISODateString): boolean {
  return new Date(dateStr).getTime() > Date.now();
}

export function formatHumanDate(dateStr: ISODateString): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
