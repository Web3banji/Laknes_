/**
 * LAKNES Quest Detail Modal
 * Full quest view with interactive task fulfillment, non-wallet actions,
 * eligibility criteria, rewards breakdown, and verification proof submission.
 */

import React, { useState, useEffect } from 'react';
import { Quest, QuestParticipation, QuestCompletionStatus, User } from '../../types/contracts.ts';
import { laknesClient } from '../../client/api-client.ts';

interface QuestDetailModalProps {
  quest: Quest | null;
  user: User | null;
  onClose: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onParticipationUpdated?: () => void;
  isSaved?: boolean;
  onToggleSave?: (questId: string) => void;
}

export function QuestDetailModal({
  quest,
  user,
  onClose,
  onOpenAuth,
  onParticipationUpdated,
  isSaved,
  onToggleSave,
}: QuestDetailModalProps) {
  const [participation, setParticipation] = useState<QuestParticipation | null>(null);
  const [proofText, setProofText] = useState('');
  const [formResponseText, setFormResponseText] = useState('');
  const [socialHandleText, setSocialHandleText] = useState('');
  const [hasVisitedLink, setHasVisitedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!quest || !user) {
      setParticipation(null);
      return;
    }

    let cancelled = false;
    const checkParticipation = async () => {
      try {
        const participations = await laknesClient.getUserQuests(user.id);
        const match = participations.find((p) => p.questId === quest.id);
        if (!cancelled && match) {
          setParticipation(match);
          if (match.submissionProof) {
            setProofText(match.submissionProof);
          }
        }
      } catch (err) {
        console.error('Error fetching user participations', err);
      }
    };

    checkParticipation();
    return () => {
      cancelled = true;
    };
  }, [quest, user]);

  if (!quest) return null;

  const isExpired = Boolean(quest.deadline && new Date(quest.deadline).getTime() < Date.now());

  // Determine non-wallet task classification
  const isWebsiteVisitTask =
    quest.questType === 'COMMUNITY' ||
    quest.instructions.toLowerCase().includes('visit') ||
    quest.instructions.toLowerCase().includes('explore') ||
    quest.instructions.toLowerCase().includes('read') ||
    quest.instructions.toLowerCase().includes('documentation');

  const isFormTask =
    quest.questType === 'FEEDBACK' ||
    quest.instructions.toLowerCase().includes('form') ||
    quest.instructions.toLowerCase().includes('survey') ||
    quest.instructions.toLowerCase().includes('feedback');

  const isSocialTask =
    quest.questType === 'SOCIAL' ||
    quest.instructions.toLowerCase().includes('follow') ||
    quest.instructions.toLowerCase().includes('twitter') ||
    quest.instructions.toLowerCase().includes('discord');

  const handleJoinQuest = async () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      const p = await laknesClient.joinQuest(quest.id);
      setParticipation(p);
      setActionSuccess('Enrolled in quest! Complete the task steps and submit your proof below.');
      if (onParticipationUpdated) onParticipationUpdated();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to enroll in quest.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalProof = proofText.trim();

    if (isFormTask && formResponseText.trim()) {
      finalProof = `[Form Response]: ${formResponseText.trim()}${finalProof ? ` | Details: ${finalProof}` : ''}`;
    } else if (isSocialTask && socialHandleText.trim()) {
      finalProof = `[Social Handle / Verification]: ${socialHandleText.trim()}${finalProof ? ` | Proof Link: ${finalProof}` : ''}`;
    } else if (isWebsiteVisitTask && hasVisitedLink) {
      finalProof = `[Website Visit Confirmed]: ${finalProof || 'Completed portal exploration.'}`;
    }

    if (!finalProof) {
      setActionError('Please provide submission details or complete the required action.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      const p = await laknesClient.submitQuestProof(quest.id, finalProof);
      setParticipation(p);
      setActionSuccess('Proof of completion submitted! Maintainers will review and verify your submission.');
      if (onParticipationUpdated) onParticipationUpdated();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-container-low border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-label-caps text-label-caps uppercase px-2.5 py-0.5 rounded bg-surface-container-high text-primary font-semibold text-xs">
                {quest.questType}
              </span>
              {quest.rewardConfiguration && (
                <span className="font-label-mono text-xs px-2.5 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary border border-tertiary-container/30">
                  {quest.rewardConfiguration.amount ? `${quest.rewardConfiguration.amount} ` : ''}
                  {quest.rewardConfiguration.rewardType}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface leading-tight">{quest.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(quest.id)}
                className={`p-1.5 rounded-full border transition-colors ${
                  isSaved
                    ? 'bg-primary-container text-on-primary-container border-primary-container'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-slate-800'
                }`}
                title={isSaved ? 'Saved to bookmarks' : 'Save quest'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSaved ? 'bookmark' : 'bookmark_border'}
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto text-xs">
          {actionSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{actionError}</span>
            </div>
          )}

          {/* Overview */}
          <div>
            <h4 className="font-semibold text-slate-200 mb-1 uppercase font-label-caps text-[11px]">Overview</h4>
            <p className="text-on-surface-variant leading-relaxed text-sm whitespace-pre-wrap">{quest.description}</p>
          </div>

          {/* Instructions */}
          {quest.instructions && (
            <div className="p-4 rounded-xl bg-surface-container border border-slate-800">
              <h4 className="font-semibold text-primary mb-2 uppercase font-label-caps text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">list_alt</span>
                Quest Instructions
              </h4>
              <p className="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{quest.instructions}</p>
            </div>
          )}

          {/* Non-Wallet Interactive Task Assist Box */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-slate-800/80 space-y-3">
            <h4 className="font-semibold text-on-surface uppercase font-label-caps text-[11px] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">task_alt</span>
              Supported Action Types (No Wallet Required)
            </h4>

            {isWebsiteVisitTask && (
              <div className="p-3 rounded-lg bg-surface-container border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-200 block">1. Explore Official Resource</span>
                  <span className="text-[11px] text-slate-400">Open documentation or protocol portal.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasVisitedLink(true);
                    window.open('https://docs.elysium.org', '_blank', 'noopener,noreferrer');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    hasVisitedLink
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-primary-container text-on-primary-container hover:bg-primary-fixed-dim'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {hasVisitedLink ? 'done' : 'open_in_new'}
                  </span>
                  <span>{hasVisitedLink ? 'Resource Visited' : 'Open Resource'}</span>
                </button>
              </div>
            )}

            {isFormTask && (
              <div className="p-3 rounded-lg bg-surface-container border border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-200 block">Complete Community Feedback</span>
                <textarea
                  value={formResponseText}
                  onChange={(e) => setFormResponseText(e.target.value)}
                  placeholder="Share your experience, feature ideas, or protocol feedback..."
                  rows={2}
                  className="w-full px-3 py-1.5 bg-surface-container-lowest text-on-surface border border-slate-700 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>
            )}

            {isSocialTask && (
              <div className="p-3 rounded-lg bg-surface-container border border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-200 block">Social Engagement</span>
                <input
                  type="text"
                  value={socialHandleText}
                  onChange={(e) => setSocialHandleText(e.target.value)}
                  placeholder="Your Twitter/X or Discord handle (e.g. @username)"
                  className="w-full px-3 py-1.5 bg-surface-container-lowest text-on-surface border border-slate-700 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>
            )}
          </div>

          {/* Criteria & Eligibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-container border border-slate-800">
              <h4 className="font-semibold text-slate-300 mb-1.5 uppercase font-label-caps text-[11px]">
                Completion Criteria
              </h4>
              <p className="text-on-surface-variant leading-relaxed">
                {quest.completionCriteria?.requiresProof
                  ? `Requires proof submission (${quest.completionCriteria.proofType || 'Text/URL'}) with ${
                      quest.completionCriteria.verificationMethod === 'AUTOMATED_API'
                        ? 'automated rule check'
                        : 'maintainer review'
                    }.`
                  : 'Action verification recorded upon submission.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-slate-800">
              <h4 className="font-semibold text-slate-300 mb-1.5 uppercase font-label-caps text-[11px]">
                Eligibility & Rules
              </h4>
              <p className="text-on-surface-variant leading-relaxed">
                {quest.eligibilityRules?.ecosystemSpecificCondition ||
                  (quest.eligibilityRules?.requiredRoles?.length
                    ? `Requires role: ${quest.eligibilityRules.requiredRoles.join(', ')}`
                    : 'Open to all authenticated Elysium community members.')}
              </p>
            </div>
          </div>

          {/* Timeline & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-slate-800 font-label-mono text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              <span>Started: {new Date(quest.startAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">timer</span>
              <span>Deadline: {quest.deadline ? new Date(quest.deadline).toLocaleDateString() : 'Continuous'}</span>
            </div>
          </div>

          {/* Participation / Submission Zone */}
          <div className="pt-2">
            {!user ? (
              <div className="p-6 rounded-xl bg-surface-container text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-3xl text-primary mb-2">login</span>
                <p className="font-semibold text-on-surface text-sm mb-1">Sign in to participate</p>
                <p className="text-on-surface-variant text-xs mb-4">
                  Log in or create a user account to join this quest and track completion.
                </p>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-5 py-2 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-semibold text-xs shadow-md"
                >
                  Sign In / Register
                </button>
              </div>
            ) : !participation ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-surface-container border border-slate-800">
                <div>
                  <h4 className="font-semibold text-on-surface text-sm">Ready to begin?</h4>
                  <p className="text-on-surface-variant text-xs">
                    Enroll now to start tracking your progress towards this quest.
                  </p>
                </div>

                <button
                  onClick={handleJoinQuest}
                  disabled={isSubmitting || Boolean(isExpired)}
                  className={`px-5 py-2.5 rounded-full font-label-caps uppercase font-semibold text-xs transition-all shrink-0 ${
                    isExpired
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-primary-container text-on-primary-container hover:bg-primary-fixed-dim shadow-[0_0_20px_rgba(0,210,255,0.3)]'
                  }`}
                >
                  {isSubmitting ? 'Joining...' : isExpired ? 'Quest Expired' : 'Join Quest'}
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-surface-container border border-slate-800 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        participation.completionStatus === 'VERIFIED'
                          ? 'bg-emerald-400'
                          : participation.completionStatus === 'PENDING_VERIFICATION'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-primary'
                      }`}
                    ></span>
                    <span className="font-semibold text-on-surface text-sm">
                      {participation.completionStatus === 'VERIFIED'
                        ? 'Quest Completed & Verified'
                        : participation.completionStatus === 'PENDING_VERIFICATION'
                        ? 'Proof Submitted (Under Review)'
                        : 'Enrolled in Quest'}
                    </span>
                  </div>
                  <span
                    className={`font-label-caps text-[11px] uppercase px-2.5 py-0.5 rounded font-bold ${
                      participation.completionStatus === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : participation.completionStatus === 'PENDING_VERIFICATION'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-surface-container-high text-primary'
                    }`}
                  >
                    Status: {participation.completionStatus}
                  </span>
                </div>

                {participation.completionStatus === 'VERIFIED' ? (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-300">
                    <p className="font-bold mb-1">🎉 Task Verified Successfully</p>
                    <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                      Your completion has been officially validated. Any associated badges or XP have been awarded to your account.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitProof} className="space-y-3">
                    <label className="block text-slate-300 font-label-caps uppercase text-[11px]">
                      Proof of Completion / Additional Links (Optional or Required)
                    </label>
                    <textarea
                      value={proofText}
                      onChange={(e) => setProofText(e.target.value)}
                      placeholder="e.g. Transaction hash, tweet URL, PR link, or summary of completed task..."
                      rows={2}
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-label-caps uppercase font-semibold text-xs shadow-md disabled:opacity-50 transition-colors"
                      >
                        {isSubmitting
                          ? 'Submitting...'
                          : participation.completionStatus === 'PENDING_VERIFICATION'
                          ? 'Update Submitted Proof'
                          : 'Submit Proof of Completion'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
