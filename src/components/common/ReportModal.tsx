/**
 * LAKNES Content Report Modal
 * Standardized reporting dialog for community moderation.
 */

import React, { useState } from 'react';
import { ContentReportTargetType } from '../../types/contracts.ts';

interface ReportModalProps {
  isOpen: boolean;
  targetType: ContentReportTargetType;
  targetId: string;
  targetName: string;
  onClose: () => void;
  onSubmitReport: (targetType: ContentReportTargetType, targetId: string, reason: string) => Promise<unknown>;
}

export function ReportModal({
  isOpen,
  targetType,
  targetId,
  targetName,
  onClose,
  onSubmitReport,
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmitReport(targetType, targetId, reason.trim());
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface-container-low border border-slate-800 rounded-2xl shadow-2xl p-space-xl relative"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400 text-[20px]">flag</span>
            <span className="font-headline-sm text-sm text-on-surface font-semibold">Report Content</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <p className="text-xs text-on-surface-variant mb-4">
          Reporting <span className="text-primary font-semibold">{targetName}</span> ({targetType}). Reports are submitted directly to platform administrators.
        </p>

        {success ? (
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs text-center font-medium">
            Thank you. Your report has been submitted for review.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Reason for report
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this content violates community guidelines, provides deceptive information, or violates standards..."
                rows={4}
                required
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-full text-xs text-on-surface-variant hover:text-on-surface bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase font-label-caps bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
