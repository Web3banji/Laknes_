/**
 * LAKNES Representative Project Dashboard Modal
 * Management portal for project owners and maintainers: status, review history, corrections, updates, and quests.
 */

import React, { useState, useEffect } from 'react';
import {
  Project,
  ProjectDashboardData,
  ProjectVerificationStatus,
  QuestType,
} from '../../types/contracts.ts';
import { laknesClient } from '../../client/api-client.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

interface ProjectDashboardModalProps {
  projectId: string | null;
  onClose: () => void;
  onProjectUpdated?: () => void;
}

export function ProjectDashboardModal({
  projectId,
  onClose,
  onProjectUpdated,
}: ProjectDashboardModalProps) {
  const [dashboard, setDashboard] = useState<ProjectDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'updates' | 'quests' | 'corrections'>('overview');

  // Form states
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);

  const [questTitle, setQuestTitle] = useState('');
  const [questDescription, setQuestDescription] = useState('');
  const [questInstructions, setQuestInstructions] = useState('');
  const [questType, setQuestType] = useState<QuestType>(QuestType.COMMUNITY);
  const [rewardAmount, setRewardAmount] = useState('100');
  const [rewardType, setRewardType] = useState<'POINTS' | 'TOKEN' | 'NFT' | 'BADGE' | 'ROLE'>('TOKEN');
  const [rewardDetails, setRewardDetails] = useState('ELYS');
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);

  const [correctionsNote, setCorrectionsNote] = useState('');
  const [isSubmittingCorrections, setIsSubmittingCorrections] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadDashboard(projectId);
    }
  }, [projectId]);

  const loadDashboard = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await laknesClient.getProjectDashboard(id);
      setDashboard(data);
      if (data.project.verificationStatus === ProjectVerificationStatus.CHANGES_REQUESTED) {
        setActiveTab('corrections');
      }
    } catch (err: any) {
      setFeedbackMessage(`Error loading dashboard: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!projectId) return null;

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateContent.trim()) return;

    setIsPostingUpdate(true);
    setFeedbackMessage(null);
    try {
      await laknesClient.createProjectUpdate(projectId, {
        title: updateTitle.trim(),
        content: updateContent.trim(),
      });
      setUpdateTitle('');
      setUpdateContent('');
      setFeedbackMessage('Announcement successfully published!');
      loadDashboard(projectId);
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      setFeedbackMessage(`Failed to publish update: ${err?.message}`);
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questTitle.trim() || !questDescription.trim()) return;

    setIsCreatingQuest(true);
    setFeedbackMessage(null);
    try {
      await laknesClient.createProjectQuest(projectId, {
        title: questTitle.trim(),
        description: questDescription.trim(),
        instructions: questInstructions.trim(),
        questType,
        completionCriteria: {
          requiresProof: true,
          proofType: 'URL',
          verificationMethod: 'MANUAL_REVIEW',
        },
        startAt: new Date().toISOString(),
        rewardConfiguration: {
          rewardType,
          amount: rewardAmount ? Number(rewardAmount) : undefined,
          rewardDetails: rewardDetails.trim() || undefined,
        },
      });
      setQuestTitle('');
      setQuestDescription('');
      setQuestInstructions('');
      setFeedbackMessage('Community quest successfully launched!');
      loadDashboard(projectId);
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      setFeedbackMessage(`Failed to create quest: ${err?.message}`);
    } finally {
      setIsCreatingQuest(false);
    }
  };

  const handleSubmitCorrections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionsNote.trim()) return;

    setIsSubmittingCorrections(true);
    setFeedbackMessage(null);
    try {
      await laknesClient.resubmitProjectCorrections(projectId, {
        correctionsSummary: correctionsNote.trim(),
      });
      setCorrectionsNote('');
      setFeedbackMessage('Corrections submitted! Project returned to PENDING_REVIEW for audit.');
      loadDashboard(projectId);
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      setFeedbackMessage(`Failed to submit corrections: ${err?.message}`);
    } finally {
      setIsSubmittingCorrections(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-surface-container-low border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-label-caps text-label-caps uppercase px-2.5 py-0.5 rounded bg-surface-container-high text-primary font-semibold text-xs">
                Representative Portal
              </span>
              {dashboard && <StatusBadge status={dashboard.project.verificationStatus} />}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface leading-tight">
                {dashboard ? dashboard.project.name : 'Loading Project...'}
              </h2>
              {dashboard?.project.verificationStatus === ProjectVerificationStatus.VERIFIED && (
                <span
                  className="material-symbols-outlined text-2xl text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                  title="Verified Checkmark: Official verified seal awarded by Laknes review team"
                >
                  verified
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div className="px-6 pt-4">
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                feedbackMessage.startsWith('Failed') || feedbackMessage.startsWith('Error')
                  ? 'bg-rose-950/40 border border-rose-800 text-rose-300'
                  : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>{feedbackMessage}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 pt-4 gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
            }`}
          >
            Overview & Status
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors ${
              activeTab === 'updates' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
            }`}
          >
            Post Announcement
          </button>
          <button
            onClick={() => setActiveTab('quests')}
            className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors ${
              activeTab === 'quests' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
            }`}
          >
            Launch Quest
          </button>
          {dashboard?.project.verificationStatus === ProjectVerificationStatus.CHANGES_REQUESTED && (
            <button
              onClick={() => setActiveTab('corrections')}
              className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors text-amber-400 ${
                activeTab === 'corrections' ? 'border-amber-400' : 'border-transparent'
              }`}
            >
              Submit Corrections
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto text-xs">
          {isLoading || !dashboard ? (
            <div className="p-8 text-center text-slate-400">Loading project telemetry...</div>
          ) : (
            <>
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Status & Verified Checkmark Banner */}
                  {dashboard.project.verificationStatus === ProjectVerificationStatus.VERIFIED ? (
                    <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 relative overflow-hidden">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.3)]">
                          <span className="material-symbols-outlined text-[24px]">verified</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-emerald-200">Official Verified Checkmark Awarded</h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-label-mono bg-emerald-500/20 text-emerald-300 uppercase font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">verified</span>
                              Verified Protocol
                            </span>
                          </div>
                          <p className="text-xs text-emerald-200/80 leading-relaxed">
                            Our team has reviewed your submission, verified smart contracts and project documentation, and awarded the official <strong>Verified Checkmark</strong>. Your project is actively discoverable in the curated ecosystem directory.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : dashboard.project.verificationStatus === ProjectVerificationStatus.PENDING_REVIEW ? (
                    <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 relative overflow-hidden">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-300">
                          <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-amber-200">Awaiting Review for Verified Checkmark</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-label-mono bg-amber-500/20 text-amber-300 uppercase font-semibold">
                              Review in Progress
                            </span>
                          </div>
                          <p className="text-xs text-amber-200/80 leading-relaxed">
                            Your project profile has been registered and is waiting for review from our team. To ensure ecosystem security and quality, every project must be inspected and reviewed by us before receiving the official <strong>Verified Checkmark</strong>. It is after we review it that we award the checkmark and publish it to the directory.
                          </p>
                          <div className="mt-3 flex items-center gap-4 text-[11px] font-label-mono text-amber-300/70">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              Status: Queued for Administrative Audit
                            </span>
                            <span>&bull;</span>
                            <span>Checkmark: Awarded Upon Review Approval</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : dashboard.project.verificationStatus === ProjectVerificationStatus.CHANGES_REQUESTED ? (
                    <div className="p-5 rounded-2xl bg-sky-950/30 border border-sky-500/40 relative overflow-hidden">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-300">
                          <span className="material-symbols-outlined text-[24px]">edit_note</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-sky-200">Revisions Requested for Verification</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-label-mono bg-sky-500/20 text-sky-300 uppercase font-semibold">
                              Action Required
                            </span>
                          </div>
                          <p className="text-xs text-sky-200/80 leading-relaxed">
                            Our reviewers have examined your submission and requested adjustments before awarding the Verified Checkmark. Please check the review notes below and use the "Submit Corrections" tab to update your application.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40">
                      <p className="text-rose-300 text-xs font-semibold">Project submission was rejected during administrative review.</p>
                    </div>
                  )}

                  {/* Review History */}
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-2 uppercase font-label-caps text-[11px]">
                      Administrative Review History
                    </h4>
                    {dashboard.reviewHistory.length === 0 ? (
                      <div className="p-4 rounded-xl bg-surface-container text-slate-500 italic">
                        No reviews recorded yet. Initial verification pending.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.reviewHistory.map((rev) => (
                          <div key={rev.id} className="p-3.5 rounded-xl bg-surface-container border border-slate-800">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-primary">{rev.decision}</span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {new Date(rev.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-300 whitespace-pre-wrap">{rev.reviewNotes}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Team Members */}
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-2 uppercase font-label-caps text-[11px]">
                      Authorized Representatives
                    </h4>
                    <div className="space-y-2">
                      {dashboard.members.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-lg bg-surface-container border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="text-on-surface font-medium">{m.user?.username || m.userId}</span>
                          </div>
                          <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary font-bold">
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Post Updates */}
              {activeTab === 'updates' && (
                <form onSubmit={handlePostUpdate} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Announcement Title *
                    </label>
                    <input
                      type="text"
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      placeholder="e.g. Mainnet V2 Upgrade Scheduled"
                      required
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Content / Announcement Text *
                    </label>
                    <textarea
                      value={updateContent}
                      onChange={(e) => setUpdateContent(e.target.value)}
                      placeholder="Share protocol milestones, releases, or announcements with followers..."
                      rows={5}
                      required
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isPostingUpdate || !updateTitle.trim() || !updateContent.trim()}
                      className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-md disabled:opacity-50"
                    >
                      {isPostingUpdate ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: Launch Quest */}
              {activeTab === 'quests' && (
                <form onSubmit={handleCreateQuest} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                        Quest Title *
                      </label>
                      <input
                        type="text"
                        value={questTitle}
                        onChange={(e) => setQuestTitle(e.target.value)}
                        placeholder="e.g. Test liquidity pool swap"
                        required
                        className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                        Quest Type *
                      </label>
                      <select
                        value={questType}
                        onChange={(e) => setQuestType(e.target.value as QuestType)}
                        className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                      >
                        {Object.values(QuestType).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Brief Description *
                    </label>
                    <input
                      type="text"
                      value={questDescription}
                      onChange={(e) => setQuestDescription(e.target.value)}
                      placeholder="One-line summary of what participants need to accomplish"
                      required
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Step-by-Step Instructions
                    </label>
                    <textarea
                      value={questInstructions}
                      onChange={(e) => setQuestInstructions(e.target.value)}
                      placeholder="1. Visit app.elysium... 2. Connect wallet... 3. Submit proof tx hash..."
                      rows={3}
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                        Reward Amount
                      </label>
                      <input
                        type="number"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                        Reward Category
                      </label>
                      <select
                        value={rewardType}
                        onChange={(e) => setRewardType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
                      >
                        <option value="TOKEN">TOKEN</option>
                        <option value="POINTS">POINTS</option>
                        <option value="NFT">NFT</option>
                        <option value="BADGE">BADGE</option>
                        <option value="ROLE">ROLE</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Reward Label / Asset (Optional)
                    </label>
                    <input
                      type="text"
                      value={rewardDetails}
                      onChange={(e) => setRewardDetails(e.target.value)}
                      placeholder="e.g. ELYS, Governance Points, Genesis Pass"
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isCreatingQuest || !questTitle.trim() || !questDescription.trim()}
                      className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-md disabled:opacity-50"
                    >
                      {isCreatingQuest ? 'Launching...' : 'Launch Community Quest'}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 4: Corrections */}
              {activeTab === 'corrections' && (
                <form onSubmit={handleSubmitCorrections} className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800 text-amber-300">
                    <p className="font-semibold text-xs mb-1">Changes Requested by Reviewers</p>
                    <p className="text-[11px]">
                      Please address the notes in the Review History tab and submit a summary of corrections below to re-enter the review queue.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Corrections Summary *
                    </label>
                    <textarea
                      value={correctionsNote}
                      onChange={(e) => setCorrectionsNote(e.target.value)}
                      placeholder="Detail the changes made in response to reviewer feedback..."
                      rows={4}
                      required
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingCorrections || !correctionsNote.trim()}
                      className="px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-label-caps uppercase font-bold text-xs shadow-md disabled:opacity-50"
                    >
                      {isSubmittingCorrections ? 'Submitting...' : 'Resubmit for Review'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
