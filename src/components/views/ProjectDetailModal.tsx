/**
 * LAKNES Project Detail Modal
 * Full public profile, announcements, quests, and engagement triggers.
 */

import React, { useState, useEffect } from 'react';
import { Project, ProjectUpdate, Quest, ContentReportTargetType } from '../../types/contracts.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { laknesClient } from '../../client/api-client.ts';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  isFollowing?: boolean;
  isSaved?: boolean;
  onToggleFollow?: (projectId: string) => void;
  onToggleSave?: (projectId: string) => void;
  onOpenReport?: (type: ContentReportTargetType, id: string, name: string) => void;
  onOpenDashboard?: (projectId: string) => void;
  isRepresentative?: boolean;
}

export function ProjectDetailModal({
  project,
  onClose,
  isFollowing,
  isSaved,
  onToggleFollow,
  onToggleSave,
  onOpenReport,
  onOpenDashboard,
  isRepresentative,
}: ProjectDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'updates' | 'quests'>('overview');
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;

    const loadData = async () => {
      setLoadingExtras(true);
      try {
        const [upd, qst] = await Promise.all([
          laknesClient.getProjectUpdates(project.id).catch(() => []),
          laknesClient.getProjectQuests(project.id).catch(() => []),
        ]);
        if (!cancelled) {
          setUpdates(upd);
          setQuests(qst);
        }
      } finally {
        if (!cancelled) setLoadingExtras(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [project]);

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-surface-container-low border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Banner Area */}
        <div className="relative w-full h-44 sm:h-56 bg-surface-container-lowest shrink-0">
          {project.bannerUrl ? (
            <img src={project.bannerUrl} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-outline-variant">token</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent pointer-events-none"></div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          {/* Logo & Category */}
          <div className="absolute bottom-4 left-6 flex items-end gap-3">
            <div className="w-16 h-16 rounded-xl bg-surface-container-high border-2 border-surface-container-low overflow-hidden shadow-lg flex items-center justify-center shrink-0">
              {project.logoUrl ? (
                <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary text-2xl">rocket_launch</span>
              )}
            </div>

            <div className="mb-1">
              <span className="inline-block px-2 py-0.5 rounded bg-surface-container-high/80 text-[10px] font-label-caps uppercase text-primary font-semibold mb-1">
                {project.category}
              </span>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface leading-tight">{project.name}</h2>
                {project.verificationStatus === 'VERIFIED' ? (
                  <span
                    className="material-symbols-outlined text-2xl text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                    title="Verified Checkmark: Officially reviewed and approved"
                  >
                    verified
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Pending Verification Notice */}
          {project.verificationStatus === 'PENDING_REVIEW' && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200">
              <span className="material-symbols-outlined text-[20px] text-amber-400 shrink-0">hourglass_top</span>
              <div>
                <p className="font-bold text-amber-300 mb-0.5">Awaiting Review for Verified Checkmark</p>
                <p className="text-amber-200/80 leading-relaxed text-[11px]">
                  This project has been submitted and is queued for verification. The official Verified Checkmark will only be awarded after review and approval by the ecosystem maintainers.
                </p>
              </div>
            </div>
          )}

          {/* Action Row & Links */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <StatusBadge status={project.verificationStatus} size="md" />
              {project.ecosystem && (
                <span className="text-xs font-label-mono text-primary font-semibold px-2 py-0.5 rounded bg-primary-container/10 border border-primary-container/20">
                  {project.ecosystem}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isRepresentative && onOpenDashboard && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenDashboard(project.id);
                  }}
                  className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">dashboard</span>
                  Dashboard
                </button>
              )}

              {onToggleFollow && (
                <button
                  onClick={() => onToggleFollow(project.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                    isFollowing
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isFollowing ? 'check' : 'add'}
                  </span>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}

              {onToggleSave && (
                <button
                  onClick={() => onToggleSave(project.id)}
                  className={`p-1.5 rounded-full text-xs transition-colors ${
                    isSaved
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-surface-container-high text-on-surface hover:text-primary'
                  }`}
                  title={isSaved ? 'Saved' : 'Save'}
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {isSaved ? 'bookmark_added' : 'bookmark'}
                  </span>
                </button>
              )}

              {onOpenReport && (
                <button
                  onClick={() => onOpenReport(ContentReportTargetType.PROJECT, project.id, project.name)}
                  className="p-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-rose-400 transition-colors"
                  title="Report project"
                >
                  <span className="material-symbols-outlined text-[17px]">flag</span>
                </button>
              )}

              {project.websiteUrl && (
                <a
                  href={project.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase text-xs font-semibold flex items-center gap-1"
                >
                  <span>Visit Website</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                </a>
              )}
            </div>
          </div>

          {/* Social Links Row */}
          {(project.websiteUrl || project.documentationUrl || project.socialLinks) && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-label-mono text-on-surface-variant">
              {project.documentationUrl && (
                <a
                  href={project.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[14px]">menu_book</span> Docs
                </a>
              )}
              {project.socialLinks?.twitter && (
                <a
                  href={project.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:text-primary"
                >
                  Twitter / X
                </a>
              )}
              {project.socialLinks?.discord && (
                <a
                  href={project.socialLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:text-primary"
                >
                  Discord
                </a>
              )}
              {project.socialLinks?.telegram && (
                <a
                  href={project.socialLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:text-primary"
                >
                  Telegram
                </a>
              )}
              {project.socialLinks?.github && (
                <a
                  href={project.socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:text-primary"
                >
                  GitHub
                </a>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-800 gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors ${
                activeTab === 'overview' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`pb-2 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'updates' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
              }`}
            >
              Announcements
              {updates.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-[10px]">{updates.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('quests')}
              className={`pb-2 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'quests' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
              }`}
            >
              Quests
              {quests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-[10px]">{quests.length}</span>
              )}
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-slate-200 mb-1.5 uppercase font-label-caps text-[11px]">Description</h4>
                <p className="text-on-surface-variant leading-relaxed text-sm whitespace-pre-wrap">{project.description}</p>
              </div>

              {project.contractAddresses && project.contractAddresses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-200 mb-1.5 uppercase font-label-caps text-[11px]">
                    Verified Smart Contracts
                  </h4>
                  <div className="space-y-1.5 font-mono">
                    {project.contractAddresses.map((addr, idx) => (
                      <div key={idx} className="p-2 rounded bg-surface-container text-[11px] text-slate-300 break-all select-all">
                        {addr}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Updates */}
          {activeTab === 'updates' && (
            <div className="space-y-3">
              {loadingExtras ? (
                <div className="text-xs text-slate-400">Loading announcements...</div>
              ) : updates.length === 0 ? (
                <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container rounded-xl">
                  No public updates posted yet by project maintainers.
                </div>
              ) : (
                updates.map((upd) => (
                  <div key={upd.id} className="p-4 rounded-xl bg-surface-container border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-on-surface text-sm">{upd.title}</h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {upd.publishedAt ? new Date(upd.publishedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-2 whitespace-pre-wrap">
                      {upd.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Quests */}
          {activeTab === 'quests' && (
            <div className="space-y-3">
              {loadingExtras ? (
                <div className="text-xs text-slate-400">Loading quests...</div>
              ) : quests.length === 0 ? (
                <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container rounded-xl">
                  No active community quests for this project right now.
                </div>
              ) : (
                quests.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl bg-surface-container border border-slate-800 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary">
                        {q.questType}
                      </span>
                      {q.rewardConfiguration && (
                        <span className="font-mono text-[11px] text-tertiary">
                          {q.rewardConfiguration.amount} {q.rewardConfiguration.rewardType}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-on-surface text-sm mt-1">{q.title}</h4>
                    <p className="text-xs text-on-surface-variant line-clamp-2">{q.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
