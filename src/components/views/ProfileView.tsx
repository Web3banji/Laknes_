/**
 * LAKNES User Profile & Dashboard View
 * Modeled with high-fidelity X-style layout:
 * - 3:1 Header Banner with camera/edit overlay & preset selector
 * - Overlapping circular Avatar (PFP) with camera/edit overlay & preset selector
 * - Display Name, Verified Badge, @username, and Role tags
 * - Multiline Bio with link detection
 * - Joined date & metric counters (Following, Quests, XP)
 * - Clickable social links: 𝕏 X (Twitter), Telegram, Instagram, Discord, GitHub, Website, and dynamic Custom Links
 * - Interactive X-style "Edit Profile" modal with live preview
 * - Comprehensive tabs: Overview, Quests History, Followed Protocols, Saved Bookmarks, Security
 */

import React, { useState, useEffect } from 'react';
import { User, Project, Quest, QuestParticipation, UserRole } from '../../types/contracts.ts';
import { laknesClient } from '../../client/api-client.ts';
import { ProjectCard } from '../common/ProjectCard.tsx';
import { QuestCard } from '../common/QuestCard.tsx';

interface ProfileViewProps {
  user: User | null;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onSelectProject: (project: Project) => void;
  onSelectQuest?: (quest: Quest) => void;
  onLogout: () => void;
  onUserUpdated: (updatedUser: User) => void;
  onOpenDashboard?: (projectId: string) => void;
  onSwitchToProjectWorkspace?: (projectId: string) => void;
}

const DEFAULT_BANNER = '/src/assets/images/elysium_profile_header_1792495690946.jpg';
const DEFAULT_AVATAR = '/src/assets/images/elysium_avatar_default_1792495691476.jpg';

const BANNER_PRESETS = [
  { name: 'Laser Grid', url: '/src/assets/images/elysium_profile_header_1792495690946.jpg' },
  { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cyber Wave', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Minimal Tech', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80' },
];

const AVATAR_PRESETS = [
  { name: 'Cyber Scout', url: '/src/assets/images/elysium_avatar_default_1792495691476.jpg' },
  { name: 'Architect', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ElysiumArchitect' },
  { name: 'Cyberpunk', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberPunk99' },
  { name: 'Operator', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NodeOperator' },
];

const AVAILABLE_INTERESTS = [
  'DeFi & Yield',
  'Infrastructure & Nodes',
  'Gaming & Metaverse',
  'AI & Tooling',
  'Social & Media',
  'NFTs & Collectibles',
  'Governance & DAOs',
  'Security & Auditing',
];

export function ProfileView({
  user,
  onNavigate,
  onOpenAuth,
  onSelectProject,
  onSelectQuest,
  onLogout,
  onUserUpdated,
  onSwitchToProjectWorkspace,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quests' | 'saved' | 'follows' | 'security'>('dashboard');
  const [savedSubTab, setSavedSubTab] = useState<'quests' | 'projects'>('quests');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Profile Edit State
  const [usernameInput, setUsernameInput] = useState(user?.username || '');
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [imageInput, setImageInput] = useState(user?.profileImage || '');
  const [headerInput, setHeaderInput] = useState(user?.headerImage || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [twitterInput, setTwitterInput] = useState(user?.socialLinks?.twitter || user?.xAccount || '');
  const [telegramInput, setTelegramInput] = useState(user?.socialLinks?.telegram || '');
  const [instagramInput, setInstagramInput] = useState(user?.socialLinks?.instagram || '');
  const [discordInput, setDiscordInput] = useState(user?.socialLinks?.discord || '');
  const [githubInput, setGithubInput] = useState(user?.socialLinks?.github || '');
  const [websiteInput, setWebsiteInput] = useState(user?.socialLinks?.website || '');
  const [customLinks, setCustomLinks] = useState<Array<{ label: string; url: string }>>(
    user?.socialLinks?.customLinks || []
  );

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Security password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Lists Data
  const [followedProjects, setFollowedProjects] = useState<Project[]>([]);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);
  const [participations, setParticipations] = useState<QuestParticipation[]>([]);
  const [allQuestsMap, setAllQuestsMap] = useState<Record<string, Quest>>({});
  const [myProjects, setMyProjects] = useState<Array<Project & { myMembershipRole?: string }>>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  useEffect(() => {
    if (user) {
      setUsernameInput(user.username || '');
      setNameInput(user.name || '');
      setBioInput(user.bio || '');
      setImageInput(user.profileImage || '');
      setHeaderInput(user.headerImage || '');
      setSelectedInterests(user.interests || []);
      setTwitterInput(user.socialLinks?.twitter || user.xAccount || '');
      setTelegramInput(user.socialLinks?.telegram || '');
      setInstagramInput(user.socialLinks?.instagram || '');
      setDiscordInput(user.socialLinks?.discord || '');
      setGithubInput(user.socialLinks?.github || '');
      setWebsiteInput(user.socialLinks?.website || '');
      setCustomLinks(user.socialLinks?.customLinks || []);
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    setIsLoadingLists(true);
    try {
      const [follows, savedP, savedQ, questsHistory, projs, allQ] = await Promise.all([
        laknesClient.getUserFollows(user.id).catch(() => []),
        laknesClient.getUserSavedProjects(user.id).catch(() => []),
        laknesClient.getUserSavedQuests(user.id).catch(() => []),
        laknesClient.getUserQuests(user.id).catch(() => []),
        laknesClient.getUserProjects(user.id).catch(() => []),
        laknesClient.getActiveQuests().catch(() => []),
      ]);

      const qMap: Record<string, Quest> = {};
      for (const q of allQ) {
        qMap[q.id] = q;
      }

      setFollowedProjects(follows);
      setSavedProjects(savedP);
      setSavedQuests(savedQ);
      setParticipations(questsHistory);
      setMyProjects(projs);
      setAllQuestsMap(qMap);
    } catch (err) {
      console.error('Error loading user data', err);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleAddCustomLink = () => {
    setCustomLinks((prev) => [...prev, { label: '', url: '' }]);
  };

  const handleUpdateCustomLink = (index: number, field: 'label' | 'url', value: string) => {
    setCustomLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveCustomLink = (index: number) => {
    setCustomLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (usernameInput.trim().length < 3) {
      setProfileMessage({ text: 'Display name / username must be at least 3 characters.', isError: true });
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      const validCustomLinks = customLinks
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.url.length > 0);

      const socialLinks = {
        twitter: twitterInput.trim() || undefined,
        telegram: telegramInput.trim() || undefined,
        instagram: instagramInput.trim() || undefined,
        discord: discordInput.trim() || undefined,
        github: githubInput.trim() || undefined,
        website: websiteInput.trim() || undefined,
        customLinks: validCustomLinks.length > 0 ? validCustomLinks : undefined,
      };

      const updated = await laknesClient.updateUserProfile(user.id, {
        username: usernameInput.trim(),
        name: nameInput.trim() || undefined,
        bio: bioInput.trim() || undefined,
        profileImage: imageInput.trim() || undefined,
        headerImage: headerInput.trim() || undefined,
        interests: selectedInterests,
        xAccount: twitterInput.trim() || undefined,
        socialLinks,
      });

      onUserUpdated(updated);
      setProfileMessage({ text: 'Profile changes saved successfully!', isError: false });
      setTimeout(() => {
        setProfileMessage(null);
        setIsEditModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setProfileMessage({ text: err?.message || 'Error updating profile.', isError: true });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ text: 'Please enter your current password.', isError: true });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ text: 'New password must be at least 8 characters long.', isError: true });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({ text: 'New passwords do not match.', isError: true });
      return;
    }

    setIsSavingPassword(true);
    try {
      await laknesClient.changePassword(currentPassword, newPassword);
      setPasswordMessage({ text: 'Password changed successfully!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordMessage(null), 3500);
    } catch (err: any) {
      setPasswordMessage({ text: err?.message || 'Failed to update password.', isError: true });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleUnfollowProject = async (projectId: string) => {
    try {
      await laknesClient.unfollowProject(projectId);
      setFollowedProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Failed to unfollow', err);
    }
  };

  const handleUnsaveProject = async (projectId: string) => {
    try {
      await laknesClient.unsaveProject(projectId);
      setSavedProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Failed to unsave project', err);
    }
  };

  const handleUnsaveQuest = async (questId: string) => {
    try {
      await laknesClient.unsaveQuest(questId);
      setSavedQuests((prev) => prev.filter((q) => q.id !== questId));
    } catch (err) {
      console.error('Failed to unsave quest', err);
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-2xl mx-auto px-margin-mobile py-24 text-center">
        <div className="p-10 rounded-2xl bg-[#141820] border border-slate-800 flex flex-col items-center shadow-2xl">
          <span className="material-symbols-outlined text-5xl text-primary mb-3">account_circle</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Sign In to View Your Dashboard</h2>
          <p className="text-xs text-on-surface-variant max-w-md mb-6 leading-relaxed">
            Access your personalized ecosystem dashboard, track followed protocols, inspect saved quests, and update your profile settings.
          </p>
          <button
            onClick={() => onOpenAuth('login')}
            className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-semibold text-xs shadow-md cursor-pointer hover:bg-primary-fixed-dim transition-all"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const formattedJoinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : 'October 2026';

  const completedQuestsCount = participations.filter((p) => p.completionStatus === 'VERIFIED').length;
  const currentBanner = user.headerImage || DEFAULT_BANNER;
  const currentAvatar = user.profileImage || DEFAULT_AVATAR;

  // Clean social links normalization
  const xLink = user.socialLinks?.twitter || user.xAccount;
  const telegramLink = user.socialLinks?.telegram;
  const instagramLink = user.socialLinks?.instagram;
  const discordHandle = user.socialLinks?.discord;
  const githubHandle = user.socialLinks?.github;
  const websiteUrl = user.socialLinks?.website;
  const customLinksList = user.socialLinks?.customLinks || [];

  return (
    <div className="w-full max-w-5xl mx-auto px-margin-mobile lg:px-margin py-space-xl">
      {/* ========================================================= */}
      {/* X-STYLE PROFILE HEADER CARD */}
      {/* ========================================================= */}
      <div className="relative rounded-3xl overflow-hidden bg-[#12161f] border border-slate-800/90 shadow-2xl mb-8">
        {/* 1. Header Banner (3:1 Aspect Ratio like on X) */}
        <div className="relative w-full h-48 sm:h-64 md:h-72 bg-slate-900 overflow-hidden group">
          <img
            src={currentBanner}
            alt="Profile Banner"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_BANNER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12161f] via-black/20 to-transparent"></div>

          {/* Banner Edit Trigger */}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg transition-all opacity-90 hover:opacity-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            <span>Change Header</span>
          </button>
        </div>

        {/* 2. Overlapping Avatar & Action Bar Row */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar (PFP overlapping the banner) */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-[#12161f] bg-slate-900 shadow-2xl overflow-hidden group shrink-0">
              <img
                src={currentAvatar}
                alt={user.name || user.username}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                title="Change Avatar"
              >
                <span className="material-symbols-outlined text-2xl">photo_camera</span>
              </button>
            </div>

            {/* Actions: Edit Profile Button & Sign Out */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-5 py-2 rounded-full border border-slate-700 hover:border-primary-container bg-surface-container/60 hover:bg-surface-container text-on-surface hover:text-primary font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit profile</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-full border border-slate-800 bg-surface-container/40 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>

          {/* 3. User Identity Block */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {user.name || user.username}
                </h1>
                <span className="material-symbols-outlined text-[20px] text-primary" title="Verified Member">
                  verified
                </span>
                {user.roles.map((r) => (
                  <span
                    key={r}
                    className={`ml-1 px-2.5 py-0.5 rounded-full text-[10px] font-label-caps uppercase font-bold border ${
                      r === UserRole.ADMIN
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-400 font-mono mt-0.5">@{user.username}</p>
            </div>

            {/* Bio with line breaks */}
            {user.bio ? (
              <p className="text-sm text-slate-200 leading-relaxed max-w-2xl whitespace-pre-wrap">
                {user.bio}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No bio added yet. Click &quot;Edit profile&quot; to customize your story, add your PFP, header, and social links.
              </p>
            )}

            {/* Interests Chips */}
            {user.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {user.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2.5 py-0.5 rounded-full bg-slate-800/80 text-primary text-[11px] font-medium border border-slate-700/60"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata (Joined date & metrics) */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-500">calendar_month</span>
                <span>Joined {formattedJoinedDate}</span>
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="flex items-center gap-1">
                <strong className="text-white font-mono">{followedProjects.length}</strong>
                <span>Following</span>
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="flex items-center gap-1">
                <strong className="text-emerald-400 font-mono">{completedQuestsCount}</strong>
                <span>Quests Verified</span>
              </span>
            </div>

            {/* 4. Rich Social Links Strip (𝕏, Telegram, Instagram, Discord, GitHub, Website, Custom Links) */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/60">
              {xLink && (
                <a
                  href={xLink.startsWith('http') ? xLink : `https://x.com/${xLink.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:text-white transition-all shadow-sm"
                >
                  <span className="font-bold text-[13px]">𝕏</span>
                  <span>@{xLink.replace(/^@/, '').replace('https://x.com/', '').replace('https://twitter.com/', '')}</span>
                </a>
              )}

              {telegramLink && (
                <a
                  href={telegramLink.startsWith('http') ? telegramLink : `https://t.me/${telegramLink.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/50 text-xs text-sky-300 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">send</span>
                  <span>t.me/{telegramLink.replace(/^@/, '').replace('https://t.me/', '')}</span>
                </a>
              )}

              {instagramLink && (
                <a
                  href={instagramLink.startsWith('http') ? instagramLink : `https://instagram.com/${instagramLink.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-950/40 hover:bg-pink-900/60 border border-pink-800/50 text-xs text-pink-300 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                  <span>@{instagramLink.replace(/^@/, '').replace('https://instagram.com/', '')}</span>
                </a>
              )}

              {discordHandle && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/40 border border-indigo-800/50 text-xs text-indigo-300 shadow-sm">
                  <span className="material-symbols-outlined text-[15px]">chat</span>
                  <span>{discordHandle}</span>
                </span>
              )}

              {githubHandle && (
                <a
                  href={githubHandle.startsWith('http') ? githubHandle : `https://github.com/${githubHandle.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:text-white transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">code</span>
                  <span>github/{githubHandle.replace(/^@/, '').replace('https://github.com/', '')}</span>
                </a>
              )}

              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-xs text-cyan-300 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">language</span>
                  <span>{websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                </a>
              )}

              {customLinksList.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-slate-700 text-xs text-primary transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">link</span>
                  <span>{link.label || 'Link'}</span>
                </a>
              ))}

              {!xLink && !telegramLink && !instagramLink && !discordHandle && !githubHandle && !websiteUrl && customLinksList.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 py-1"
                >
                  <span className="material-symbols-outlined text-[15px]">add_link</span>
                  <span>Add your social links (X, Telegram, Instagram, Portfolio)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* AUTHORIZED PROJECT BANNER (if user manages a protocol) */}
      {/* ========================================================= */}
      {myProjects.length > 0 && onSwitchToProjectWorkspace && (
        <div className="mb-6 p-5 rounded-2xl bg-[#141a24] border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <span className="material-symbols-outlined text-[24px]">token</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Authorized Representative of {myProjects[0].name}
              </span>
              <span className="text-[11px] text-slate-400">
                You hold verified management access for {myProjects.length} project workspace{myProjects.length > 1 ? 's' : ''}. Switch anytime without signing in again.
              </span>
            </div>
          </div>
          <button
            onClick={() => onSwitchToProjectWorkspace(myProjects[0].id)}
            className="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container text-xs font-bold font-label-caps uppercase shadow-md hover:bg-primary-fixed-dim transition-all shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">token</span>
            <span>Switch to Project Workspace</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TABS NAVIGATION */}
      {/* ========================================================= */}
      <div className="flex border-b border-slate-800 gap-4 sm:gap-6 mb-6 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-primary-container text-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">dashboard</span>
          Overview
        </button>

        <button
          onClick={() => setActiveTab('quests')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'quests'
              ? 'border-primary-container text-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">military_tech</span>
          Quests History ({participations.length})
        </button>

        <button
          onClick={() => setActiveTab('follows')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'follows'
              ? 'border-primary-container text-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bookmark_manager</span>
          Followed Projects ({followedProjects.length})
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'saved'
              ? 'border-primary-container text-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bookmarks</span>
          Saved Bookmarks ({savedQuests.length + savedProjects.length})
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'border-primary-container text-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Security
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB CONTENT */}
      {/* ========================================================= */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#141820] border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-mono block">Followed</span>
              <span className="text-2xl font-bold text-primary mt-1 block">{followedProjects.length}</span>
              <span className="text-[11px] text-slate-500">Active broadcasts</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#141820] border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-mono block">Quests Joined</span>
              <span className="text-2xl font-bold text-tertiary mt-1 block">{participations.length}</span>
              <span className="text-[11px] text-slate-500">Participation records</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#141820] border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-mono block">Verified Done</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">{completedQuestsCount}</span>
              <span className="text-[11px] text-slate-500">Earned achievements</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#141820] border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-mono block">Bookmarks</span>
              <span className="text-2xl font-bold text-white mt-1 block">{savedQuests.length + savedProjects.length}</span>
              <span className="text-[11px] text-slate-500">Saved items</span>
            </div>
          </div>

          {/* Recent Quests Progress */}
          <div className="p-6 rounded-2xl bg-[#141820] border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase font-label-caps">Active Quests Progress</h3>
              <button
                onClick={() => setActiveTab('quests')}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                View all ({participations.length})
              </button>
            </div>

            {participations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">military_tech</span>
                <p className="text-xs">You haven&apos;t joined any quests yet.</p>
                <button
                  onClick={() => onNavigate('quests')}
                  className="mt-3 px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase text-xs font-semibold cursor-pointer"
                >
                  Explore Quests
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {participations.slice(0, 3).map((p) => {
                  const quest = allQuestsMap[p.questId];
                  return (
                    <div
                      key={p.id}
                      onClick={() => quest && onSelectQuest && onSelectQuest(quest)}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white truncate block">
                          {quest?.title || `Quest ID: ${p.questId}`}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Enrolled: {new Date(p.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                          p.completionStatus === 'VERIFIED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : p.completionStatus === 'PENDING_VERIFICATION'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {p.completionStatus}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. QUESTS TAB */}
      {activeTab === 'quests' && (
        <div className="space-y-4">
          {participations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#141820] border border-slate-800">
              <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">military_tech</span>
              <h3 className="text-base font-bold text-white mb-1">No Quest History Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Join community bounties, explore websites, submit feedback, and earn ecosystem reputation.
              </p>
              <button
                onClick={() => onNavigate('quests')}
                className="px-5 py-2 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase text-xs font-semibold"
              >
                Find Quests to Join
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {participations.map((p) => {
                const quest = allQuestsMap[p.questId];
                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-[#141820] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">
                          {quest?.title || `Quest ${p.questId}`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            p.completionStatus === 'VERIFIED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : p.completionStatus === 'PENDING_VERIFICATION'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {p.completionStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {quest?.description || 'Community quest participation record.'}
                      </p>
                      {p.submissionProof && (
                        <p className="text-[11px] text-cyan-400 mt-2 font-mono truncate">
                          Proof: {p.submissionProof}
                        </p>
                      )}
                    </div>

                    {quest && onSelectQuest && (
                      <button
                        onClick={() => onSelectQuest(quest)}
                        className="px-4 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-slate-700 text-xs text-white shrink-0 font-medium"
                      >
                        Inspect Quest
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. FOLLOWED PROJECTS TAB */}
      {activeTab === 'follows' && (
        <div>
          {followedProjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#141820] border border-slate-800">
              <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">folder_special</span>
              <h3 className="text-base font-bold text-white mb-1">No Followed Protocols</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Follow verified protocols in the directory to receive updates directly in your Following feed.
              </p>
              <button
                onClick={() => onNavigate('projects')}
                className="px-5 py-2 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase text-xs font-semibold"
              >
                Browse Projects
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followedProjects.map((project) => (
                <div key={project.id} className="relative group">
                  <ProjectCard
                    project={project}
                    onSelectProject={onSelectProject}
                    onToggleSave={() => {}}
                    isSaved={false}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfollowProject(project.id);
                    }}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 text-[10px] font-mono z-10 transition-colors"
                  >
                    Unfollow
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. SAVED BOOKMARKS TAB */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex gap-2 p-1 rounded-xl bg-slate-900 w-fit border border-slate-800 text-xs">
            <button
              onClick={() => setSavedSubTab('quests')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                savedSubTab === 'quests' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Saved Quests ({savedQuests.length})
            </button>
            <button
              onClick={() => setSavedSubTab('projects')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                savedSubTab === 'projects' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Saved Projects ({savedProjects.length})
            </button>
          </div>

          {savedSubTab === 'quests' && (
            <div>
              {savedQuests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-[#141820] border border-slate-800">
                  No saved quests. Bookmark quests from the Quests directory to save them for later.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedQuests.map((quest) => (
                    <div key={quest.id} className="relative">
                      <QuestCard
                        quest={quest}
                        onSelectQuest={onSelectQuest || (() => {})}
                        isEnrolled={participations.some((p) => p.questId === quest.id)}
                        isSaved={true}
                        onToggleSave={() => handleUnsaveQuest(quest.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {savedSubTab === 'projects' && (
            <div>
              {savedProjects.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-[#141820] border border-slate-800">
                  No saved projects. Bookmark protocols from the directory to review them later.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProjects.map((project) => (
                    <div key={project.id} className="relative group">
                      <ProjectCard
                        project={project}
                        onSelectProject={onSelectProject}
                        onToggleSave={() => handleUnsaveProject(project.id)}
                        isSaved={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="max-w-xl p-6 rounded-2xl bg-[#141820] border border-slate-800">
          <h3 className="text-base font-bold text-white mb-1">Account Security</h3>
          <p className="text-xs text-slate-400 mb-6">
            Update your account password. Sessions are securely hashed and authenticated with salt tokens.
          </p>

          {passwordMessage && (
            <div
              className={`p-3 rounded-lg text-xs mb-4 flex items-center gap-2 ${
                passwordMessage.isError
                  ? 'bg-rose-950/40 border border-rose-800 text-rose-300'
                  : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {passwordMessage.isError ? 'error' : 'check_circle'}
              </span>
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password (min 8 chars)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingPassword}
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase text-xs font-bold shadow-md hover:bg-primary-fixed-dim disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSavingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* X-STYLE "EDIT PROFILE" MODAL WITH LIVE PREVIEW */}
      {/* ========================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#12161f] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
                <h2 className="text-base sm:text-lg font-bold text-white">Edit Profile</h2>
              </div>

              <button
                type="button"
                onClick={handleUpdateProfile}
                disabled={isSavingProfile}
                className="px-5 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isSavingProfile ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs">
              {profileMessage && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
                    profileMessage.isError
                      ? 'bg-rose-950/40 border border-rose-800 text-rose-300'
                      : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {profileMessage.isError ? 'error' : 'check_circle'}
                  </span>
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Live Preview: Header & Avatar */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-300 uppercase font-mono text-[11px] block">
                  Header & Avatar Preview
                </span>
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                  <div className="relative h-32 sm:h-40 w-full overflow-hidden">
                    <img
                      src={headerInput || DEFAULT_BANNER}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_BANNER;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20"></div>
                  </div>

                  <div className="p-4 pt-0 -mt-10 flex items-end justify-between">
                    <div className="w-20 h-20 rounded-full border-4 border-[#12161f] bg-slate-900 overflow-hidden shadow-xl">
                      <img
                        src={imageInput || DEFAULT_AVATAR}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Header Image URL & Presets */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold text-xs">Header Image URL</label>
                <input
                  type="url"
                  value={headerInput}
                  onChange={(e) => setHeaderInput(e.target.value)}
                  placeholder="https://... or select a preset below"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono mr-1">Presets:</span>
                  {BANNER_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setHeaderInput(p.url)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                        headerInput === p.url
                          ? 'bg-primary-container text-on-primary-container font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar / PFP URL & Presets */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold text-xs">Profile Picture (PFP) URL</label>
                <input
                  type="url"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  placeholder="https://... or select a preset below"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono mr-1">Presets:</span>
                  {AVATAR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setImageInput(p.url)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                        imageInput === p.url
                          ? 'bg-primary-container text-on-primary-container font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold text-xs mb-1">Display Name</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold text-xs mb-1">Username / Handle</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2 text-slate-500 font-mono">@</span>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="username"
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bio (multiline textarea with counter) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-semibold text-xs">Bio</label>
                  <span className="text-[10px] text-slate-500 font-mono">{bioInput.length} / 500</span>
                </div>
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value.slice(0, 500))}
                  placeholder="Tell the Elysium ecosystem about yourself, your protocol interests, or developer goals..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              {/* Interests Multi-Select */}
              <div>
                <label className="block text-slate-300 font-semibold text-xs mb-1.5">Ecosystem Interests</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_INTERESTS.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Social Links Form (X, Telegram, Instagram, Discord, GitHub, Website) */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h3 className="font-semibold text-white uppercase font-mono text-[11px]">
                  Social Handles & Links
                </h3>

                {/* X (Twitter) */}
                <div>
                  <label className="block text-slate-300 text-xs mb-1 flex items-center gap-1.5">
                    <span className="font-bold">𝕏</span>
                    <span>X (Twitter) Profile</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2 text-slate-500 font-mono">@</span>
                    <input
                      type="text"
                      value={twitterInput}
                      onChange={(e) => setTwitterInput(e.target.value.replace(/^@/, ''))}
                      placeholder="username or x.com/username"
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                {/* Telegram */}
                <div>
                  <label className="block text-slate-300 text-xs mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-sky-400">send</span>
                    <span>Telegram Link or Handle</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2 text-slate-500 font-mono">t.me/</span>
                    <input
                      type="text"
                      value={telegramInput}
                      onChange={(e) => setTelegramInput(e.target.value.replace(/^@/, '').replace('https://t.me/', ''))}
                      placeholder="username"
                      className="w-full pl-14 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                {/* Instagram */}
                <div>
                  <label className="block text-slate-300 text-xs mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-pink-400">photo_camera</span>
                    <span>Instagram Handle or Link</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2 text-slate-500 font-mono">@</span>
                    <input
                      type="text"
                      value={instagramInput}
                      onChange={(e) => setInstagramInput(e.target.value.replace(/^@/, '').replace('https://instagram.com/', ''))}
                      placeholder="username"
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                {/* Discord & GitHub Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-xs mb-1">Discord Tag</label>
                    <input
                      type="text"
                      value={discordInput}
                      onChange={(e) => setDiscordInput(e.target.value)}
                      placeholder="username#0000 or username"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs mb-1">GitHub Username</label>
                    <input
                      type="text"
                      value={githubInput}
                      onChange={(e) => setGithubInput(e.target.value.replace(/^@/, '').replace('https://github.com/', ''))}
                      placeholder="github-handle"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                {/* Website / Portfolio */}
                <div>
                  <label className="block text-slate-300 text-xs mb-1">Website / Portfolio URL</label>
                  <input
                    type="url"
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    placeholder="https://yourportfolio.xyz"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Dynamic Custom Links List (any other link) */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-xs font-semibold">
                      Custom Links (Substack, Mirror, Lens, etc.)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCustomLink}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Add Link</span>
                    </button>
                  </div>

                  {customLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => handleUpdateCustomLink(idx, 'label', e.target.value)}
                        placeholder="Label (e.g. Substack)"
                        className="w-1/3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => handleUpdateCustomLink(idx, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomLink(idx)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Remove link"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-[#0e1219]">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-full border border-slate-700 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateProfile}
                disabled={isSavingProfile}
                className="px-6 py-2 rounded-full bg-primary-container text-on-primary-container font-semibold text-xs hover:bg-primary-fixed-dim transition-all disabled:opacity-50 shadow-md"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
