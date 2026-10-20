/**
 * LAKNES Project Workspace View
 * Comprehensive management portal for project representatives:
 * 1. Overview
 * 2. My Project (Profile Editor & Verification Audit)
 * 3. Quests (Creation, Management & Proof Verification)
 * 4. Audience (Analytics & Community Intelligence)
 * 5. Creator Studio (Official Broadcasts & Announcements)
 * 6. Settings (Team Members, Roles & Workspace Governance)
 */

import React, { useState, useEffect } from 'react';
import {
  Project,
  ProjectDashboardData,
  ProjectVerificationStatus,
  ProjectCategory,
  QuestType,
  MembershipRole,
  PublicationStatus,
  User,
  ProjectUpdate,
  Quest,
} from '../../types/contracts.ts';
import { laknesClient } from '../../client/api-client.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

interface ProjectWorkspaceViewProps {
  projectId: string;
  user: User;
  activeTab: 'overview' | 'my-project' | 'quests' | 'audience' | 'creator-studio' | 'settings';
  onTabChange: (tab: 'overview' | 'my-project' | 'quests' | 'audience' | 'creator-studio' | 'settings') => void;
  onSwitchToUserWorkspace: () => void;
  onSelectOtherProject: (projectId: string) => void;
  userProjects: Array<Project & { myMembershipRole?: string }>;
  onNavigateToSubmitNewProject: () => void;
  onProjectUpdated?: () => void;
}

export function ProjectWorkspaceView({
  projectId,
  user,
  activeTab,
  onTabChange,
  onSwitchToUserWorkspace,
  onSelectOtherProject,
  userProjects,
  onNavigateToSubmitNewProject,
  onProjectUpdated,
}: ProjectWorkspaceViewProps) {
  const [dashboard, setDashboard] = useState<ProjectDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Edit Project Profile state
  const [editForm, setEditForm] = useState({
    name: '',
    category: ProjectCategory.DEFI,
    shortDescription: '',
    description: '',
    websiteUrl: '',
    documentationUrl: '',
    communityUrl: '',
    logoUrl: '',
    bannerUrl: '',
    twitter: '',
    discord: '',
    telegram: '',
    github: '',
    contracts: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Resubmit corrections state
  const [correctionsNote, setCorrectionsNote] = useState('');
  const [isSubmittingCorrections, setIsSubmittingCorrections] = useState(false);

  // Creator Studio Update state
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [updateLinks, setUpdateLinks] = useState('');
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);

  // Quest Creation state
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [questTitle, setQuestTitle] = useState('');
  const [questDescription, setQuestDescription] = useState('');
  const [questInstructions, setQuestInstructions] = useState('');
  const [questType, setQuestType] = useState<QuestType>(QuestType.COMMUNITY);
  const [rewardAmount, setRewardAmount] = useState('100');
  const [rewardType, setRewardType] = useState<'POINTS' | 'TOKEN' | 'NFT' | 'BADGE' | 'ROLE'>('TOKEN');
  const [rewardDetails, setRewardDetails] = useState('ELYS');
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);

  // Team Invite state
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>(MembershipRole.MAINTAINER);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    loadDashboardData(projectId);
  }, [projectId]);

  const loadDashboardData = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await laknesClient.getProjectDashboard(id);
      setDashboard(data);
      // Initialize edit form
      const p = data.project;
      setEditForm({
        name: p.name || '',
        category: p.category || ProjectCategory.DEFI,
        shortDescription: p.shortDescription || '',
        description: p.description || '',
        websiteUrl: p.websiteUrl || '',
        documentationUrl: p.documentationUrl || '',
        communityUrl: p.communityUrl || '',
        logoUrl: p.logoUrl || '',
        bannerUrl: p.bannerUrl || '',
        twitter: p.socialLinks?.twitter || '',
        discord: p.socialLinks?.discord || '',
        telegram: p.socialLinks?.telegram || '',
        github: p.socialLinks?.github || '',
        contracts: (p.contractAddresses || []).join('\n'),
      });
    } catch (err: any) {
      setFeedbackMessage({ text: `Failed to load project telemetry: ${err?.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (text: string, isError = false) => {
    setFeedbackMessage({ text, isError });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // 1. Save Project Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboard) return;

    setIsSavingProfile(true);
    try {
      const contractAddrs = editForm.contracts
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const socialLinks: Record<string, string> = {};
      if (editForm.twitter.trim()) socialLinks.twitter = editForm.twitter.trim();
      if (editForm.discord.trim()) socialLinks.discord = editForm.discord.trim();
      if (editForm.telegram.trim()) socialLinks.telegram = editForm.telegram.trim();
      if (editForm.github.trim()) socialLinks.github = editForm.github.trim();

      await laknesClient.updateProject(projectId, {
        name: editForm.name.trim(),
        category: editForm.category,
        shortDescription: editForm.shortDescription.trim(),
        description: editForm.description.trim(),
        websiteUrl: editForm.websiteUrl.trim(),
        documentationUrl: editForm.documentationUrl.trim() || undefined,
        communityUrl: editForm.communityUrl.trim() || undefined,
        logoUrl: editForm.logoUrl.trim() || undefined,
        bannerUrl: editForm.bannerUrl.trim() || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        contractAddresses: contractAddrs.length > 0 ? contractAddrs : undefined,
      });

      showNotification('Project profile successfully updated!');
      await loadDashboardData(projectId);
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      showNotification(`Update failed: ${err?.message}`, true);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Resubmit Corrections
  const handleResubmitCorrections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionsNote.trim()) return;

    setIsSubmittingCorrections(true);
    try {
      await laknesClient.resubmitProjectCorrections(projectId, {
        correctionsSummary: correctionsNote.trim(),
      });
      setCorrectionsNote('');
      showNotification('Corrections submitted! Project returned to PENDING_REVIEW queue.');
      await loadDashboardData(projectId);
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      showNotification(`Submission error: ${err?.message}`, true);
    } finally {
      setIsSubmittingCorrections(false);
    }
  };

  // 3. Creator Studio - Post Announcement
  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateContent.trim()) return;

    setIsPostingUpdate(true);
    try {
      const parsedLinks = updateLinks
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await laknesClient.createProjectUpdate(projectId, {
        title: updateTitle.trim(),
        content: updateContent.trim(),
        links: parsedLinks.length > 0 ? parsedLinks : undefined,
      });

      setUpdateTitle('');
      setUpdateContent('');
      setUpdateLinks('');
      showNotification('Announcement broadcasted to ecosystem feed!');
      await loadDashboardData(projectId);
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      showNotification(`Failed to broadcast: ${err?.message}`, true);
    } finally {
      setIsPostingUpdate(false);
    }
  };

  // 4. Quests - Create Quest
  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questTitle.trim() || !questDescription.trim()) return;

    setIsCreatingQuest(true);
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
      setIsQuestModalOpen(false);
      showNotification('Community quest successfully launched!');
      await loadDashboardData(projectId);
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      showNotification(`Failed to launch quest: ${err?.message}`, true);
    } finally {
      setIsCreatingQuest(false);
    }
  };

  // 5. Settings - Invite Member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;

    setIsInviting(true);
    try {
      await laknesClient.inviteMember(projectId, inviteIdentifier.trim(), inviteRole);
      setInviteIdentifier('');
      showNotification(`Team invitation sent for ${inviteRole}!`);
      await loadDashboardData(projectId);
    } catch (err: any) {
      showNotification(`Invite failed: ${err?.message}`, true);
    } finally {
      setIsInviting(false);
    }
  };

  // 6. Settings - Remove Member
  const handleRemoveMember = async (memberUserId: string) => {
    try {
      await laknesClient.removeMember(projectId, memberUserId);
      showNotification('Team member removed from project workspace.');
      await loadDashboardData(projectId);
    } catch (err: any) {
      showNotification(`Failed to remove member: ${err?.message}`, true);
    }
  };

  if (isLoading || !dashboard) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-24 text-center">
        <div className="w-10 h-10 border-2 border-primary-container border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xs text-on-surface-variant font-label-mono">
          Loading Project Workspace Telemetry...
        </p>
      </div>
    );
  }

  const { project, analytics } = dashboard;
  const isVerified = project.verificationStatus === ProjectVerificationStatus.VERIFIED;
  const isPendingReview = project.verificationStatus === ProjectVerificationStatus.PENDING_REVIEW;
  const isChangesRequested = project.verificationStatus === ProjectVerificationStatus.CHANGES_REQUESTED;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-xl">
      {/* Top Workspace Header Bar */}
      <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 shadow-xl mb-6 relative overflow-hidden">
        {/* Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 bg-primary-container/10 blur-[90px] rounded-full"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-container overflow-hidden border-2 border-slate-700/80 shadow-md shrink-0 flex items-center justify-center">
              {project.logoUrl ? (
                <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary text-3xl">token</span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded bg-primary-container/15 text-primary font-bold">
                  Project Workspace
                </span>
                <StatusBadge status={project.verificationStatus} />
                <span className="font-label-mono text-[11px] text-slate-400">Role: {dashboard.userRole}</span>
              </div>

              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-on-surface tracking-tight">{project.name}</h1>
                {isVerified && (
                  <span
                    className="material-symbols-outlined text-2xl text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                    title="Verified Checkmark: Official verified seal awarded by Laknes review team"
                  >
                    verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Workspace Switcher & Context Action */}
          <div className="flex flex-wrap items-center gap-3">
            {userProjects.length > 1 && (
              <select
                value={projectId}
                onChange={(e) => onSelectOtherProject(e.target.value)}
                className="bg-surface-container text-xs text-on-surface border border-slate-700 rounded-full px-3 py-2 font-label-mono focus:outline-none focus:border-primary-container"
              >
                {userProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    Project: {p.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={onNavigateToSubmitNewProject}
              className="px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high border border-slate-700 text-xs text-slate-300 font-label-caps uppercase flex items-center gap-1.5 transition-colors"
              title="Register and onboard an additional project workspace"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>New Project</span>
            </button>

            <button
              onClick={onSwitchToUserWorkspace}
              className="px-4 py-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-label-caps uppercase font-semibold flex items-center gap-2 transition-all shadow-sm border border-slate-700/60"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">person</span>
              <span>Switch to User Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 ${
            feedbackMessage.isError
              ? 'bg-rose-950/40 border border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {feedbackMessage.isError ? 'error' : 'task_alt'}
          </span>
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Verification Status Banner */}
      {isPendingReview && (
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#181c26] to-amber-950/30 border border-amber-500/40 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
            {/* Visual Graphic */}
            <div className="w-full lg:w-72 h-44 rounded-2xl overflow-hidden border border-amber-500/30 shrink-0 shadow-lg relative bg-slate-900">
              <img
                src="/src/assets/images/project_review_status_1792495692422.jpg"
                alt="Verification In Progress"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-amber-300">
                <span>STAGE: REVIEW QUEUE</span>
                <span className="flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  EVALUATION
                </span>
              </div>
            </div>

            {/* Explanatory Context */}
            <div className="flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                  <span>Credentials Submitted &bull; Awaiting Foundation Review</span>
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                Your Project Credentials Are Under Active Review
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Thank you for submitting your protocol credentials for <strong className="text-primary">{project.name}</strong>.
                To preserve security and eliminate scam tokens, all projects must sign in with their Gmail, submit credentials, and wait for review before receiving the official <strong>Verified Checkmark</strong>.
              </p>

              {/* Progress Milestones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                  <span>1. Credentials Received</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-amber-400 animate-spin">sync</span>
                  <span>2. Integrity & Tech Review</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>3. Verified Seal & Listing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isVerified && (
        <div className="mb-6 p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 relative overflow-hidden shadow-lg">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.3)]">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-bold text-emerald-200">Official Verified Checkmark Awarded</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-label-mono bg-emerald-500/20 text-emerald-300 uppercase font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                  Verified Protocol
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Our review team has verified your documentation, contracts, and authenticity. Your project proudly displays the <strong>Verified Checkmark</strong> across all discovery cards and follower feeds.
              </p>
            </div>
          </div>
        </div>
      )}

      {isChangesRequested && (
        <div className="mb-6 p-5 rounded-2xl bg-sky-950/30 border border-sky-500/40 relative overflow-hidden shadow-lg">
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
                Reviewers requested adjustments before awarding the Verified Checkmark. Review notes below and use the "My Project" tab to submit corrections.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Project Navigation Items Bar */}
      <div className="flex border-b border-slate-800 gap-4 mb-8 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'overview', label: 'Overview', icon: 'dashboard' },
          { id: 'my-project', label: 'My Project', icon: 'edit_square' },
          { id: 'quests', label: 'Quests', icon: 'explore' },
          { id: 'audience', label: 'Audience', icon: 'group' },
          { id: 'creator-studio', label: 'Creator Studio', icon: 'campaign' },
          { id: 'settings', label: 'Settings', icon: 'settings' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 ${
                isActive
                  ? 'border-primary-container text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ==================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-surface-container-low border border-slate-800">
              <span className="text-[11px] font-label-mono text-slate-400 uppercase block mb-1">Followers</span>
              <span className="text-2xl font-bold text-primary font-label-mono">{analytics.followerCount}</span>
              <span className="text-[10px] text-emerald-400 block mt-1">Ecosystem Watchers</span>
            </div>
            <div className="p-5 rounded-xl bg-surface-container-low border border-slate-800">
              <span className="text-[11px] font-label-mono text-slate-400 uppercase block mb-1">Saves / Bookmarks</span>
              <span className="text-2xl font-bold text-primary font-label-mono">{analytics.savedCount}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Bookmarked by Users</span>
            </div>
            <div className="p-5 rounded-xl bg-surface-container-low border border-slate-800">
              <span className="text-[11px] font-label-mono text-slate-400 uppercase block mb-1">Active Quests</span>
              <span className="text-2xl font-bold text-tertiary-container font-label-mono">
                {analytics.activeQuests}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Community Missions</span>
            </div>
            <div className="p-5 rounded-xl bg-surface-container-low border border-slate-800">
              <span className="text-[11px] font-label-mono text-slate-400 uppercase block mb-1">
                Announcements
              </span>
              <span className="text-2xl font-bold text-on-surface font-label-mono">{analytics.updatesCount}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Broadcast Posts</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800">
            <h3 className="text-xs font-semibold uppercase font-label-caps text-slate-300 mb-4">
              Workspace Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => onTabChange('my-project')}
                className="p-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-800 text-left transition-colors flex flex-col justify-between"
              >
                <span className="material-symbols-outlined text-primary text-xl mb-2">edit_note</span>
                <span className="text-xs font-bold text-on-surface">Edit Profile</span>
                <span className="text-[10px] text-slate-400">Update logo, bio & links</span>
              </button>

              <button
                onClick={() => onTabChange('creator-studio')}
                className="p-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-800 text-left transition-colors flex flex-col justify-between"
              >
                <span className="material-symbols-outlined text-tertiary-container text-xl mb-2">campaign</span>
                <span className="text-xs font-bold text-on-surface">Creator Studio</span>
                <span className="text-[10px] text-slate-400">Broadcast updates to feed</span>
              </button>

              <button
                onClick={() => onTabChange('quests')}
                className="p-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-800 text-left transition-colors flex flex-col justify-between"
              >
                <span className="material-symbols-outlined text-emerald-400 text-xl mb-2">rocket_launch</span>
                <span className="text-xs font-bold text-on-surface">Launch Quest</span>
                <span className="text-[10px] text-slate-400">Engage community users</span>
              </button>

              <button
                onClick={() => onTabChange('audience')}
                className="p-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-800 text-left transition-colors flex flex-col justify-between"
              >
                <span className="material-symbols-outlined text-primary text-xl mb-2">analytics</span>
                <span className="text-xs font-bold text-on-surface">Audience Intel</span>
                <span className="text-[10px] text-slate-400">Explore community growth</span>
              </button>
            </div>
          </div>

          {/* Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Announcements */}
            <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase font-label-caps text-primary">
                  Recent Announcements ({dashboard.recentUpdates.length})
                </h4>
                <button
                  onClick={() => onTabChange('creator-studio')}
                  className="text-[11px] text-primary hover:underline font-label-mono"
                >
                  Manage in Studio &rarr;
                </button>
              </div>

              {dashboard.recentUpdates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-surface-container rounded-xl">
                  No announcements published yet. Open Creator Studio to draft your first broadcast.
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.recentUpdates.slice(0, 3).map((upd) => (
                    <div key={upd.id} className="p-3.5 rounded-xl bg-surface-container border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-on-surface truncate">{upd.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(upd.publishedAt || upd.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{upd.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quests Status */}
            <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase font-label-caps text-primary">
                  Active Quests ({dashboard.quests.length})
                </h4>
                <button
                  onClick={() => onTabChange('quests')}
                  className="text-[11px] text-primary hover:underline font-label-mono"
                >
                  View Quests &rarr;
                </button>
              </div>

              {dashboard.quests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-surface-container rounded-xl">
                  No quests created yet. Launch an on-chain or community quest to engage users.
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.quests.slice(0, 3).map((q) => (
                    <div key={q.id} className="p-3.5 rounded-xl bg-surface-container border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-xs text-on-surface">{q.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-label-mono bg-surface-container-high text-primary uppercase">
                            {q.questType}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Reward: {q.rewardConfiguration.amount} {q.rewardConfiguration.rewardDetails || 'Points'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: MY PROJECT (PROFILE EDITOR) */}
      {/* ==================================================== */}
      {activeTab === 'my-project' && (
        <div className="space-y-8">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-primary font-label-caps uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  Project Profile Information
                </h3>
                <span className="text-xs text-slate-400 font-label-mono">Slug: /{project.slug}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                    Category *
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as ProjectCategory })}
                    className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  >
                    {Object.values(ProjectCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                  Short Description (Card Summary) *
                </label>
                <input
                  type="text"
                  value={editForm.shortDescription}
                  onChange={(e) => setEditForm({ ...editForm, shortDescription: e.target.value })}
                  maxLength={180}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                  Full Detailed Description *
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={5}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                    Website URL *
                  </label>
                  <input
                    type="url"
                    value={editForm.websiteUrl}
                    onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                    Documentation URL
                  </label>
                  <input
                    type="url"
                    value={editForm.documentationUrl}
                    onChange={(e) => setEditForm({ ...editForm, documentationUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                    Community / App URL
                  </label>
                  <input
                    type="url"
                    value={editForm.communityUrl}
                    onChange={(e) => setEditForm({ ...editForm, communityUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              {/* Media URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={editForm.logoUrl}
                    onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                    Banner Image URL
                  </label>
                  <input
                    type="url"
                    value={editForm.bannerUrl}
                    onChange={(e) => setEditForm({ ...editForm, bannerUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              {/* Socials & Contracts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-label-mono text-slate-400 mb-1">Twitter / X</label>
                  <input
                    type="text"
                    value={editForm.twitter}
                    onChange={(e) => setEditForm({ ...editForm, twitter: e.target.value })}
                    placeholder="@handle"
                    className="w-full px-2.5 py-1.5 bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-label-mono text-slate-400 mb-1">Discord</label>
                  <input
                    type="text"
                    value={editForm.discord}
                    onChange={(e) => setEditForm({ ...editForm, discord: e.target.value })}
                    placeholder="discord.gg/..."
                    className="w-full px-2.5 py-1.5 bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-label-mono text-slate-400 mb-1">Telegram</label>
                  <input
                    type="text"
                    value={editForm.telegram}
                    onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })}
                    placeholder="t.me/..."
                    className="w-full px-2.5 py-1.5 bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-label-mono text-slate-400 mb-1">GitHub</label>
                  <input
                    type="text"
                    value={editForm.github}
                    onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                    placeholder="github.com/..."
                    className="w-full px-2.5 py-1.5 bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                  Verified Smart Contract Addresses (one per line)
                </label>
                <textarea
                  value={editForm.contracts}
                  onChange={(e) => setEditForm({ ...editForm, contracts: e.target.value })}
                  placeholder="0x123...&#10;0x456..."
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </div>
          </form>

          {/* Resubmit Corrections Form (if CHANGES_REQUESTED) */}
          {isChangesRequested && (
            <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-800 space-y-4">
              <h3 className="text-sm font-semibold text-amber-300 font-label-caps uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">rate_review</span>
                Submit Corrections in Response to Review
              </h3>
              <p className="text-xs text-amber-200/80">
                Please summarize the fixes and changes you have made to address reviewer notes. Once submitted, your project will re-enter the administrative review queue.
              </p>

              <form onSubmit={handleResubmitCorrections} className="space-y-4">
                <textarea
                  value={correctionsNote}
                  onChange={(e) => setCorrectionsNote(e.target.value)}
                  placeholder="Detail changes made to documentation, contracts, or credentials..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingCorrections || !correctionsNote.trim()}
                    className="px-6 py-2 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-label-caps uppercase font-bold text-xs shadow-md disabled:opacity-50"
                  >
                    {isSubmittingCorrections ? 'Submitting...' : 'Resubmit for Verified Review'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Review Audit History */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 font-label-caps uppercase tracking-wider">
              Administrative Review Timeline
            </h3>
            {dashboard.reviewHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No formal reviews recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {dashboard.reviewHistory.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-surface-container border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-primary">{rev.decision}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{rev.reviewNotes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: QUESTS MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === 'quests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-container-low border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-on-surface">Community Quests</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Design interactive on-chain and social challenges to incentivize community engagement and reward loyal contributors.
              </p>
            </div>

            <button
              onClick={() => setIsQuestModalOpen(true)}
              className="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-semibold text-xs shadow-md shrink-0 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Launch New Quest</span>
            </button>
          </div>

          {/* Quests List */}
          {dashboard.quests.length === 0 ? (
            <div className="p-16 rounded-2xl bg-surface-container-low border border-slate-800 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">military_tech</span>
              <h4 className="text-base font-bold text-on-surface mb-1">No Quests Active</h4>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                Launch your first community quest to grow your protocol's verified user base.
              </p>
              <button
                onClick={() => setIsQuestModalOpen(true)}
                className="px-4 py-2 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold uppercase font-label-caps"
              >
                Create Quest Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.quests.map((q) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-surface-container-low border border-slate-800 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-label-mono uppercase bg-primary-container/15 text-primary font-bold">
                        {q.questType}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800">
                        {q.publicationStatus}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-on-surface mb-1">{q.title}</h4>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">{q.description}</p>
                    {q.instructions && (
                      <p className="text-[11px] text-slate-400 font-mono line-clamp-1">
                        Instructions: {q.instructions}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-label-mono text-primary font-semibold">
                      Reward: {q.rewardConfiguration.amount} {q.rewardConfiguration.rewardDetails || 'Points'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Launched {new Date(q.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quest Creation Modal */}
          {isQuestModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-surface-container-low border border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <h3 className="text-base font-bold text-on-surface">Launch Community Quest</h3>
                  <button
                    onClick={() => setIsQuestModalOpen(false)}
                    className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleCreateQuest} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Quest Title *
                    </label>
                    <input
                      type="text"
                      value={questTitle}
                      onChange={(e) => setQuestTitle(e.target.value)}
                      placeholder="e.g. Stake tokens in Elysium Liquidity Pool"
                      required
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Quest Type *
                    </label>
                    <select
                      value={questType}
                      onChange={(e) => setQuestType(e.target.value as QuestType)}
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
                    >
                      {Object.values(QuestType).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Short Description *
                    </label>
                    <input
                      type="text"
                      value={questDescription}
                      onChange={(e) => setQuestDescription(e.target.value)}
                      placeholder="Brief overview of quest objective"
                      required
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                      Step-by-Step Instructions
                    </label>
                    <textarea
                      value={questInstructions}
                      onChange={(e) => setQuestInstructions(e.target.value)}
                      placeholder="1. Visit app... 2. Complete on-chain tx... 3. Paste tx hash proof..."
                      rows={3}
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
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
                        Reward Type
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
                      Reward Label / Asset
                    </label>
                    <input
                      type="text"
                      value={rewardDetails}
                      onChange={(e) => setRewardDetails(e.target.value)}
                      placeholder="e.g. ELYS, Genesis Pass, XP"
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsQuestModalOpen(false)}
                      className="px-4 py-2 rounded-full text-xs text-on-surface-variant hover:text-on-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingQuest || !questTitle.trim() || !questDescription.trim()}
                      className="px-6 py-2 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-md disabled:opacity-50"
                    >
                      {isCreatingQuest ? 'Launching...' : 'Launch Quest'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: AUDIENCE & ANALYTICS */}
      {/* ==================================================== */}
      {activeTab === 'audience' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface-container-low border border-slate-800">
              <span className="text-[11px] font-label-mono text-slate-400 uppercase block mb-1">
                Ecosystem Followers
              </span>
              <span className="text-3xl font-bold text-primary font-label-mono">{analytics.followerCount}</span>
              <span className="text-[10px] text-emerald-400 block mt-1">+ Active Subscribers</span>
            </div>
            <div className="p-5 rounded-2xl bg-surface-container-low border border-slate-800">
              <span className="text-[11px] font-label-mono text-slate-400 uppercase block mb-1">
                Bookmarks / Saves
              </span>
              <span className="text-3xl font-bold text-primary font-label-mono">{analytics.savedCount}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Saved to Watchlists</span>
            </div>
            <div className="p-5 rounded-2xl bg-surface-container-low border border-slate-800">
              <span className="text-[11px] font-label-mono text-slate-400 uppercase block mb-1">
                Total Participants
              </span>
              <span className="text-3xl font-bold text-tertiary-container font-label-mono">
                {analytics.totalParticipants}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Quest Contributors</span>
            </div>
            <div className="p-5 rounded-2xl bg-surface-container-low border border-slate-800">
              <span className="text-[11px] font-label-mono text-slate-400 uppercase block mb-1">
                Verifiable Quality
              </span>
              <span className="text-3xl font-bold text-emerald-400 font-label-mono">100%</span>
              <span className="text-[10px] text-emerald-300 block mt-1">On-Chain Verifiable</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase font-label-caps">
              Audience Engagement Intelligence
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Users who follow <strong className="text-primary">{project.name}</strong> receive real-time updates directly in their personal Following Feed. Publishing regular updates through Creator Studio accelerates ecosystem ranking and community retention.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-xl bg-surface-container border border-slate-800/80">
                <span className="material-symbols-outlined text-primary text-xl mb-1">hub</span>
                <h5 className="text-xs font-bold text-on-surface">Community Reach</h5>
                <p className="text-[11px] text-slate-400 mt-1">
                  Broadcasting announcements delivers notifications across the entire Elysium gateway.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface-container border border-slate-800/80">
                <span className="material-symbols-outlined text-tertiary-container text-xl mb-1">token</span>
                <h5 className="text-xs font-bold text-on-surface">Quest Conversion</h5>
                <p className="text-[11px] text-slate-400 mt-1">
                  Active participants convert to long-term token holders and on-chain liquidity providers.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface-container border border-slate-800/80">
                <span className="material-symbols-outlined text-emerald-400 text-xl mb-1">verified_user</span>
                <h5 className="text-xs font-bold text-on-surface">Verified Prestige</h5>
                <p className="text-[11px] text-slate-400 mt-1">
                  The verified checkmark increases user confidence and elevates protocol credibility.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: CREATOR STUDIO */}
      {/* ==================================================== */}
      {activeTab === 'creator-studio' && (
        <div className="space-y-8">
          {/* Studio Header */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded bg-tertiary-container/15 text-tertiary-container font-bold mb-2 inline-block">
                  Broadcast Suite
                </span>
                <h3 className="text-xl font-bold text-on-surface">Creator Studio</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Draft, schedule, and publish official announcements and releases directly to your followers and the curated ecosystem gateway.
                </p>
              </div>
            </div>
          </div>

          {/* Broadcast Composer */}
          <form onSubmit={handlePostUpdate} className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4 shadow-xl">
            <h4 className="text-xs font-semibold uppercase font-label-caps text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              Broadcast Official Announcement
            </h4>

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Announcement Headline *
              </label>
              <input
                type="text"
                value={updateTitle}
                onChange={(e) => setUpdateTitle(e.target.value)}
                placeholder="e.g. Mainnet V2 Upgrade & Governance Epoch Genesis Live"
                required
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
              />
            </div>

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Announcement Body *
              </label>
              <textarea
                value={updateContent}
                onChange={(e) => setUpdateContent(e.target.value)}
                placeholder="Write the full update text. Share details of technical releases, audits, staking pools, or governance updates..."
                rows={5}
                required
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Attached Resource Links (one per line, e.g. audit report, medium article)
              </label>
              <textarea
                value={updateLinks}
                onChange={(e) => setUpdateLinks(e.target.value)}
                placeholder="https://docs.elysium.org/release-v2&#10;https://github.com/..."
                rows={2}
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPostingUpdate || !updateTitle.trim() || !updateContent.trim()}
                className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>{isPostingUpdate ? 'Broadcasting...' : 'Publish to Follower Feed'}</span>
              </button>
            </div>
          </form>

          {/* Published Announcements History */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
            <h4 className="text-xs font-semibold uppercase font-label-caps text-slate-300">
              Published Broadcasts ({dashboard.recentUpdates.length})
            </h4>

            {dashboard.recentUpdates.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No announcements published yet.</p>
            ) : (
              <div className="space-y-3">
                {dashboard.recentUpdates.map((upd) => (
                  <div key={upd.id} className="p-4 rounded-xl bg-surface-container border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h5 className="font-bold text-xs text-on-surface">{upd.title}</h5>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(upd.publishedAt || upd.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap mb-2 leading-relaxed">{upd.content}</p>
                    {upd.links && upd.links.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/40">
                        {upd.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-mono text-primary hover:underline"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: SETTINGS (TEAM MEMBERS & GOVERNANCE) */}
      {/* ==================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-8">
          {/* Team Members List */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-semibold uppercase font-label-caps text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">groups</span>
                Authorized Project Representatives
              </h3>
              <span className="text-xs text-slate-400 font-label-mono">
                {dashboard.members.length} Authorized Members
              </span>
            </div>

            <div className="space-y-3">
              {dashboard.members.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-surface-container border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary border border-slate-700">
                      {(m.user?.username || m.userId).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-on-surface block">
                        {m.user?.username || m.userId}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Joined: {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary font-bold">
                      {m.role}
                    </span>
                    {dashboard.userRole === MembershipRole.OWNER && m.userId !== user.id && (
                      <button
                        onClick={() => handleRemoveMember(m.userId)}
                        className="text-rose-400 hover:text-rose-300 text-xs p-1"
                        title="Remove Representative"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Invite Form */}
            {dashboard.userRole === MembershipRole.OWNER && (
              <form onSubmit={handleInviteMember} className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                  placeholder="Enter username or email of team member..."
                  required
                  className="flex-1 px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MembershipRole)}
                  className="px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                >
                  <option value={MembershipRole.MAINTAINER}>Maintainer</option>
                  <option value={MembershipRole.CONTRIBUTOR}>Contributor</option>
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !inviteIdentifier.trim()}
                  className="px-5 py-2 rounded-lg bg-primary-container text-on-primary-container text-xs font-semibold font-label-caps uppercase shadow disabled:opacity-50 whitespace-nowrap"
                >
                  {isInviting ? 'Inviting...' : 'Invite Member'}
                </button>
              </form>
            )}
          </div>

          {/* Security & Boundary Card */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase font-label-caps text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              Role-Based Governance & Permissions
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              LAKNES strictly isolates workspace permissions:
            </p>
            <ul className="text-xs text-slate-400 space-y-1 list-disc pl-5 leading-relaxed font-label-mono">
              <li>Project accounts manage profiles, launch quests, and broadcast updates only for their authorized project.</li>
              <li>Project representatives do NOT receive administrative or review permissions over Laknes platform governance.</li>
              <li>User accounts do NOT receive project-management permissions without verified project membership.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
