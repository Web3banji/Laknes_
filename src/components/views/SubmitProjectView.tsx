/**
 * LAKNES Project Submission View
 * Comprehensive onboarding pipeline for new projects entering the Elysium ecosystem.
 */

import React, { useState } from 'react';
import { ProjectCategory, User } from '../../types/contracts.ts';
import { laknesClient } from '../../client/api-client.ts';

interface SubmitProjectViewProps {
  user: User | null;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode?: 'login' | 'register', accountType?: 'user' | 'project') => void;
  onProjectSubmitted: (projectId: string) => void;
}

export function SubmitProjectView({
  user,
  onNavigate,
  onOpenAuth,
  onProjectSubmitted,
}: SubmitProjectViewProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: ProjectCategory.DEFI,
    shortDescription: '',
    description: '',
    websiteUrl: '',
    documentationUrl: '',
    logoUrl: '',
    bannerUrl: '',
    ecosystem: 'Elysium',
    twitter: '',
    discord: '',
    telegram: '',
    github: '',
    contracts: '',
    supportingInfo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ id: string; name: string } | null>(null);

  const handleNameChange = (val: string) => {
    const derivedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug === '' || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') ? derivedSlug : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth('login');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const contractAddrs = formData.contracts
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const socialLinks: Record<string, string> = {};
      if (formData.twitter.trim()) socialLinks.twitter = formData.twitter.trim();
      if (formData.discord.trim()) socialLinks.discord = formData.discord.trim();
      if (formData.telegram.trim()) socialLinks.telegram = formData.telegram.trim();
      if (formData.github.trim()) socialLinks.github = formData.github.trim();

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        category: formData.category,
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
        websiteUrl: formData.websiteUrl.trim(),
        documentationUrl: formData.documentationUrl.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        bannerUrl: formData.bannerUrl.trim() || undefined,
        ecosystem: formData.ecosystem.trim() || 'Elysium',
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        contractAddresses: contractAddrs.length > 0 ? contractAddrs : undefined,
        supportingInfo: formData.supportingInfo.trim() || undefined,
      };

      const result = await laknesClient.submitProject(payload);
      setSuccessResult({ id: result.id, name: result.name });
      onProjectSubmitted(result.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit project. Please verify all inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-2xl mx-auto px-margin-mobile py-24 text-center">
        <div className="p-10 rounded-2xl bg-surface-container-low border border-slate-800 flex flex-col items-center">
          <span className="material-symbols-outlined text-5xl text-primary mb-3">lock</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Authentication Required</h2>
          <p className="text-xs text-on-surface-variant max-w-md mb-6 leading-relaxed">
            You must be logged in to register an Elysium ecosystem project. Your account will automatically be granted Owner role for the submitted project.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onOpenAuth('login', 'project')}
              className="px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-xs font-label-caps uppercase"
            >
              Sign In as Representative
            </button>
            <button
              onClick={() => onOpenAuth('register', 'project')}
              className="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-semibold text-xs shadow-md"
            >
              Register Project Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User cannot submit a project if they signed in as a standard user
  const isStandardUserOnly =
    user &&
    !user.roles.includes(UserRole.PROJECT_REPRESENTATIVE) &&
    !user.roles.includes(UserRole.ADMIN);

  if (isStandardUserOnly) {
    return (
      <div className="w-full max-w-2xl mx-auto px-margin-mobile py-24 text-center">
        <div className="p-10 rounded-3xl bg-[#141820] border border-amber-500/30 flex flex-col items-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
            <span className="material-symbols-outlined text-3xl">shield_person</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Project Submissions Reserved for Project Accounts</h2>
          <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
            You are currently signed in as an individual community member (<strong className="text-primary font-mono">@{user.username}</strong>).
            <br />
            Individual user accounts cannot submit projects.
            <br /><br />
            To register and manage a protocol, please sign in with your project&apos;s Google (Gmail) or dedicated Project Account credentials. Submissions then undergo Elysium review before public directory listing.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => onOpenAuth('login', 'project')}
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-md hover:bg-primary-fixed-dim transition-all cursor-pointer"
            >
              Sign In as Project Account
            </button>
            <button
              onClick={() => onNavigate('explore')}
              className="px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-label-caps uppercase text-xs transition-colors cursor-pointer"
            >
              Back to Explore
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (successResult) {
    return (
      <div className="w-full max-w-3xl mx-auto px-margin-mobile py-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#141820] border border-slate-800 text-center flex flex-col items-center shadow-2xl">
          {/* Review Status Graphic */}
          <div className="w-full max-w-md h-48 rounded-2xl overflow-hidden mb-6 border border-slate-700/60 shadow-xl relative">
            <img
              src="/src/assets/images/project_review_status_1792495692422.jpg"
              alt="Verification Review In Progress"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141820] via-transparent to-transparent"></div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mb-3">
            <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
            <span>STATUS: PENDING REVIEW</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Project Credentials Submitted!</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mb-6 leading-relaxed">
            Your protocol credentials for <strong className="text-primary">{successResult.name}</strong> have been received and are waiting for verification review.
            <br /><br />
            Our review board will verify your smart contracts, team credentials, documentation, and social links. Once approved, your project receives the official verified checkmark and is published to the public ecosystem directory.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => onNavigate('project-overview')}
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-md hover:bg-primary-fixed-dim transition-all cursor-pointer"
            >
              Open Project Status Hub
            </button>
            <button
              onClick={() => onNavigate('projects')}
              className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-caps uppercase text-xs cursor-pointer border border-slate-700"
            >
              Browse Public Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-margin-mobile lg:px-margin py-space-xl">
      {/* Page Header */}
      <div className="mb-space-xl pb-space-lg border-b border-slate-800">
        <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-high w-fit mb-2">
          <span className="font-label-caps text-label-caps uppercase text-primary-fixed tracking-wider text-[11px]">
            Ecosystem Registry
          </span>
        </div>
        <h1 className="font-headline-xl text-3xl text-on-surface font-bold tracking-tight">
          Submit Project to Elysium
        </h1>
        <p className="font-body-md text-on-surface-variant text-sm mt-1">
          Apply for verification in the curated LAKNES ecosystem directory. Submissions undergo maintainer verification before appearing in public discovery.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Identity */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-primary font-label-caps uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">badge</span>
            1. Core Project Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Elysium Dex Protocol"
                required
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
              />
            </div>

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Slug (URL Identifier) *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="elysium-dex-protocol"
                required
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs font-mono focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ProjectCategory })}
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
              >
                {Object.values(ProjectCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Ecosystem Framework *
              </label>
              <input
                type="text"
                value={formData.ecosystem}
                onChange={(e) => setFormData({ ...formData, ecosystem: e.target.value })}
                placeholder="Elysium"
                required
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
              Short Description (Teaser) *
            </label>
            <input
              type="text"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="A one-sentence summary for cards and search results (max 160 chars)"
              maxLength={160}
              required
              className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
            />
          </div>

          <div>
            <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
              Full Project Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your project, architecture, mission, tokenomics, and team..."
              rows={5}
              required
              className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
            />
          </div>
        </div>

        {/* URLs & Media */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-primary font-label-caps uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">link</span>
            2. Web & Media Assets
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Official Website URL *
              </label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://example.com"
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
                value={formData.documentationUrl}
                onChange={(e) => setFormData({ ...formData, documentationUrl: e.target.value })}
                placeholder="https://docs.example.com"
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Logo Image URL
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://.../logo.png"
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
              />
            </div>

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Banner Image URL
              </label>
              <input
                type="url"
                value={formData.bannerUrl}
                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                placeholder="https://.../banner.png"
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>
        </div>

        {/* Social Links & Contracts */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-primary font-label-caps uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">share</span>
            3. Social Channels & Smart Contracts
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Twitter / X URL
              </label>
              <input
                type="url"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                placeholder="https://x.com/project"
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Discord Invite URL
              </label>
              <input
                type="url"
                value={formData.discord}
                onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                placeholder="https://discord.gg/project"
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                Telegram URL
              </label>
              <input
                type="url"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                placeholder="https://t.me/project"
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                placeholder="https://github.com/project"
                className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
              Verified Smart Contract Addresses (one per line)
            </label>
            <textarea
              value={formData.contracts}
              onChange={(e) => setFormData({ ...formData, contracts: e.target.value })}
              placeholder="0x1234567890abcdef... (Elysium Mainnet)&#10;0xabcdef1234567890..."
              rows={3}
              className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
              Supporting Notes for Reviewers
            </label>
            <textarea
              value={formData.supportingInfo}
              onChange={(e) => setFormData({ ...formData, supportingInfo: e.target.value })}
              placeholder="Provide references, audit reports, or proof of team affiliation to expedite approval..."
              rows={2}
              className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-surface-container border border-slate-800">
          <div className="text-xs text-on-surface-variant">
            <span className="font-semibold text-on-surface block">Review & Ownership Notice</span>
            By submitting, you register as the project Owner. Projects are reviewed by admins prior to public directory indexing.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-[0_0_24px_rgba(0,210,255,0.35)] hover:bg-primary-fixed-dim hover:text-on-primary-fixed transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Project for Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
