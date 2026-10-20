/**
 * LAKNES Standardized Status Badge
 * Reusable visual indicator for verification, publication, and membership states.
 */

import React from 'react';
import { ProjectVerificationStatus, PublicationStatus, MembershipRole } from '../../types/contracts.ts';

interface StatusBadgeProps {
  status: ProjectVerificationStatus | PublicationStatus | MembershipRole | string;
  size?: 'sm' | 'md';
}

export function VerifiedCheckmarkBadge({
  size = 'sm',
  className = '',
  showLabel = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}) {
  const iconSize = size === 'sm' ? 'text-[14px]' : size === 'md' ? 'text-[16px]' : 'text-[20px]';
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-label-mono ${padding} rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)] select-none ${className}`}
      title="Verified Checkmark: Official seal awarded by Laknes maintainers following security & authenticity review"
    >
      <span className={`material-symbols-outlined ${iconSize} text-emerald-400 shrink-0`}>verified</span>
      {showLabel && <span className="font-semibold tracking-wide">Verified</span>}
    </span>
  );
}

export function PendingReviewBadge({
  size = 'sm',
  className = '',
  showLabel = true,
}: {
  size?: 'sm' | 'md';
  className?: string;
  showLabel?: boolean;
}) {
  const iconSize = size === 'sm' ? 'text-[13px]' : 'text-[15px]';
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-label-mono ${padding} rounded-full bg-amber-950/50 text-amber-300 border border-amber-500/30 select-none ${className}`}
      title="Awaiting Review: This project will receive the official Verified Checkmark once approved by our review team"
    >
      <span className={`material-symbols-outlined ${iconSize} text-amber-400 shrink-0`}>hourglass_top</span>
      {showLabel && <span className="font-medium">Awaiting Review</span>}
    </span>
  );
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case ProjectVerificationStatus.VERIFIED:
      return <VerifiedCheckmarkBadge size={size} />;

    case ProjectVerificationStatus.PENDING_REVIEW:
      return <PendingReviewBadge size={size} />;

    case ProjectVerificationStatus.CHANGES_REQUESTED:
      return (
        <span className={`inline-flex items-center gap-1 font-label-mono ${sizeClasses} rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-sky-400 border border-sky-500/20 shadow-sm`}>
          <span className="material-symbols-outlined text-[13px]">edit_note</span>
          Changes Requested
        </span>
      );

    case ProjectVerificationStatus.REJECTED:
      return (
        <span className={`inline-flex items-center gap-1 font-label-mono ${sizeClasses} rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-rose-400 border border-rose-500/20 shadow-sm`}>
          <span className="material-symbols-outlined text-[13px]">cancel</span>
          Rejected
        </span>
      );

    case PublicationStatus.PUBLISHED:
      return (
        <span className={`inline-flex items-center gap-1 font-label-mono ${sizeClasses} rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-emerald-400 border border-emerald-500/20`}>
          <span className="material-symbols-outlined text-[13px]">check_circle</span>
          Published
        </span>
      );

    case PublicationStatus.DRAFT:
      return (
        <span className={`inline-flex items-center gap-1 font-label-mono ${sizeClasses} rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface-variant border border-outline-variant/30`}>
          <span className="material-symbols-outlined text-[13px]">draft</span>
          Draft
        </span>
      );

    case MembershipRole.OWNER:
      return (
        <span className={`inline-flex items-center gap-1 font-label-mono ${sizeClasses} rounded-full bg-surface-container-high text-primary-fixed border border-primary-fixed-dim/30`}>
          <span className="material-symbols-outlined text-[13px]">workspace_premium</span>
          Owner
        </span>
      );

    case MembershipRole.MAINTAINER:
      return (
        <span className={`inline-flex items-center gap-1 font-label-mono ${sizeClasses} rounded-full bg-surface-container-high text-secondary border border-secondary/30`}>
          <span className="material-symbols-outlined text-[13px]">shield</span>
          Maintainer
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1 font-label-mono ${sizeClasses} rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/30`}>
          {status}
        </span>
      );
  }
}
