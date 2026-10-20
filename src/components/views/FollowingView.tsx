/**
 * LAKNES Following View
 * Curated feed of updates, announcements, published quests, and protocols followed by the user.
 * Persists following relationships in the database across login sessions.
 */

import React, { useState, useEffect } from 'react';
import { Project, ProjectUpdate, Quest, User } from '../../types/contracts.ts';
import { laknesClient } from '../../client/api-client.ts';
import { QuestCard } from '../common/QuestCard.tsx';

interface FollowingViewProps {
  user: User | null;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onSelectProject: (project: Project) => void;
  onSelectQuest?: (quest: Quest) => void;
  onToggleFollow: (projectId: string) => void;
  followedProjectIds: Set<string>;
  savedProjectIds?: Set<string>;
  savedQuestIds?: Set<string>;
  onToggleSave?: (projectId: string, e: React.MouseEvent) => void;
  onToggleSaveQuest?: (questId: string, e: React.MouseEvent) => void;
}

interface FeedItem extends ProjectUpdate {
  project?: Partial<Project>;
}

export function FollowingView({
  user,
  onNavigate,
  onOpenAuth,
  onSelectProject,
  onSelectQuest,
  onToggleFollow,
  followedProjectIds,
  savedProjectIds,
  savedQuestIds,
  onToggleSave,
  onToggleSaveQuest,
}: FollowingViewProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'quests' | 'protocols'>('feed');
  const [followedProjects, setFollowedProjects] = useState<Project[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [followingQuests, setFollowingQuests] = useState<Array<Quest & { project?: Partial<Project> }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [follows, feed, allProjects, fQuests] = await Promise.all([
          laknesClient.getUserFollows(user.id).catch(() => []),
          laknesClient.getFollowingFeed(user.id).catch(() => []),
          laknesClient.discoverProjects({ limit: 12 }).catch(() => []),
          laknesClient.getFollowingQuests(user.id).catch(() => []),
        ]);

        if (!isCancelled) {
          setFollowedProjects(follows);
          setFeedItems(feed);
          setFollowingQuests(fQuests);
          // Suggest projects that user doesn't follow yet
          const unmanaged = allProjects.filter((p) => !followedProjectIds.has(p.id));
          setRecommendedProjects(unmanaged.slice(0, 6));
        }
      } catch (err) {
        console.error('Failed to load following data', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [user, followedProjectIds]);

  if (!user) {
    return (
      <div className="w-full max-w-2xl mx-auto px-margin-mobile py-24 text-center">
        <div className="p-10 rounded-2xl bg-surface-container-low border border-slate-800 flex flex-col items-center">
          <span className="material-symbols-outlined text-5xl text-primary mb-3">bookmark_manager</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Sign in to Access Your Feed</h2>
          <p className="text-xs text-on-surface-variant max-w-md mb-6 leading-relaxed">
            Follow ecosystem projects to build your personal broadcast feed, receive real-time protocol updates, and never miss quest launches.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-semibold text-xs shadow-md"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('projects')}
              className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-caps uppercase text-xs"
            >
              Browse Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg mb-space-xl pb-space-lg border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-high w-fit mb-2">
            <span className="font-label-caps text-label-caps uppercase text-primary-fixed tracking-wider text-[11px]">
              Personalized Broadcast
            </span>
          </div>
          <h1 className="font-headline-xl text-3xl text-on-surface font-bold tracking-tight">
            Following & Updates
          </h1>
          <p className="font-body-md text-on-surface-variant text-sm mt-1">
            Real-time announcements, published quests, and milestones from your followed protocols.
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-4 bg-surface-container-low px-4 py-2.5 rounded-xl border border-slate-800 shrink-0 font-label-mono">
          <div className="text-left">
            <span className="text-[10px] text-on-surface-variant uppercase block">Followed</span>
            <span className="text-sm font-bold text-primary">{followedProjects.length} Protocols</span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="text-left">
            <span className="text-[10px] text-on-surface-variant uppercase block">Updates</span>
            <span className="text-sm font-bold text-tertiary-container">{feedItems.length} Posts</span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="text-left">
            <span className="text-[10px] text-on-surface-variant uppercase block">Quests</span>
            <span className="text-sm font-bold text-emerald-400">{followingQuests.length} Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 mb-8 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('feed')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'feed'
              ? 'border-primary-container text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">dynamic_feed</span>
          Protocol Updates ({feedItems.length})
        </button>

        <button
          onClick={() => setActiveTab('quests')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'quests'
              ? 'border-primary-container text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">military_tech</span>
          Published Quests ({followingQuests.length})
        </button>

        <button
          onClick={() => setActiveTab('protocols')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'protocols'
              ? 'border-primary-container text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">domain</span>
          Followed Protocols ({followedProjects.length})
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></span>
          <span>Loading your personalized feed...</span>
        </div>
      ) : activeTab === 'feed' ? (
        /* Tab 1: Updates Feed */
        <div>
          {feedItems.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-2xl bg-surface-container-low border border-slate-800 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">campaign</span>
              <h3 className="text-base font-bold text-on-surface mb-1">No Announcements Yet</h3>
              <p className="text-xs text-on-surface-variant max-w-md mb-6 leading-relaxed">
                {followedProjects.length === 0
                  ? "You aren't following any protocols yet. Explore the ecosystem directory and follow projects to receive announcements here."
                  : 'The protocols you follow have not published any announcements yet. Check back soon for updates!'}
              </p>

              {/* Recommended to Follow */}
              {recommendedProjects.length > 0 && (
                <div className="w-full max-w-4xl mt-4 pt-6 border-t border-slate-800/80">
                  <h4 className="text-xs font-semibold uppercase font-label-caps text-primary mb-4 text-left">
                    Recommended Protocols to Follow
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {recommendedProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="p-4 rounded-xl bg-surface-container border border-slate-800 text-left flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-surface-container-high overflow-hidden shrink-0 flex items-center justify-center">
                              {proj.logoUrl ? (
                                <img src={proj.logoUrl} alt={proj.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-sm text-primary">token</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-bold text-xs text-on-surface truncate">{proj.name}</h5>
                              <span className="text-[10px] text-slate-400 font-label-mono">{proj.category}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{proj.shortDescription}</p>
                        </div>
                        <button
                          onClick={() => onToggleFollow(proj.id)}
                          className="w-full py-1.5 rounded-lg bg-primary-container text-on-primary-container text-[11px] font-semibold font-label-caps uppercase hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          Follow
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl">
              {feedItems.map((item) => (
                <article
                  key={item.id}
                  className="p-6 rounded-2xl bg-surface-container-low border border-slate-800 hover:border-slate-700 transition-colors shadow-lg"
                >
                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/60">
                    <div
                      onClick={() => item.project && onSelectProject(item.project as Project)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-container overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center">
                        {item.project?.logoUrl ? (
                          <img src={item.project.logoUrl} alt={item.project.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-primary text-xl">token</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                            {item.project?.name || 'Protocol Update'}
                          </span>
                          {item.project?.verificationStatus === 'VERIFIED' && (
                            <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          {new Date(item.publishedAt || item.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary">
                      {item.project?.category || 'Announcement'}
                    </span>
                  </div>

                  {/* Title & Content */}
                  <h3 className="text-lg font-bold text-on-surface mb-2">{item.title}</h3>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap mb-4">
                    {item.content}
                  </div>

                  {/* Links / Resources if any */}
                  {item.links && item.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800/60">
                      {item.links.map((l: any, i) => {
                        const url = typeof l === 'string' ? l : l?.url || '#';
                        const title = typeof l === 'string' ? (l.length > 35 ? l.substring(0, 35) + '...' : l) : l?.title || 'Related Link';
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">link</span>
                            <span>{title}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'quests' ? (
        /* Tab 2: Quests from Followed Protocols */
        <div>
          {followingQuests.length === 0 ? (
            <div className="p-16 rounded-2xl bg-surface-container-low border border-slate-800 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">military_tech</span>
              <h3 className="text-base font-bold text-on-surface mb-1">No Active Quests from Followed Protocols</h3>
              <p className="text-xs text-on-surface-variant max-w-md mb-6 leading-relaxed">
                The projects you follow have not posted new quests yet. Explore all ecosystem quests to find active tasks.
              </p>
              <button
                onClick={() => onNavigate('quests')}
                className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold uppercase font-label-caps shadow-md"
              >
                Browse All Quests
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {followingQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  projectName={quest.project?.name}
                  projectLogo={quest.project?.logoUrl}
                  onSelect={onSelectQuest || (() => {})}
                  isSaved={savedQuestIds?.has(quest.id)}
                  onToggleSave={onToggleSaveQuest}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tab 3: Followed Protocols Directory */
        <div>
          {followedProjects.length === 0 ? (
            <div className="p-16 rounded-2xl bg-surface-container-low border border-slate-800 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">domain_disabled</span>
              <h3 className="text-base font-bold text-on-surface mb-1">Not Following Any Protocols</h3>
              <p className="text-xs text-on-surface-variant max-w-md mb-6 leading-relaxed">
                You haven't followed any projects yet. Discover protocols building on Elysium and follow them to receive custom announcements.
              </p>
              <button
                onClick={() => onNavigate('projects')}
                className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold uppercase font-label-caps shadow-md"
              >
                Explore Projects Directory
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {followedProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-surface-container-low border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        onClick={() => onSelectProject(p)}
                        className="flex items-center gap-3 cursor-pointer group min-w-0"
                      >
                        <div className="w-11 h-11 rounded-xl bg-surface-container overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center">
                          {p.logoUrl ? (
                            <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-primary text-xl">token</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors truncate">
                              {p.name}
                            </h4>
                            {p.verificationStatus === 'VERIFIED' && (
                              <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-label-mono block">{p.category}</span>
                        </div>
                      </div>

                      {onToggleSave && (
                        <button
                          onClick={(e) => onToggleSave(p.id, e)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            savedProjectIds?.has(p.id)
                              ? 'text-primary bg-primary-container/20'
                              : 'text-slate-400 hover:text-on-surface'
                          }`}
                          title="Bookmark project"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {savedProjectIds?.has(p.id) ? 'bookmark' : 'bookmark_border'}
                          </span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {p.shortDescription}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectProject(p)}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>View Profile</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </button>

                    <button
                      onClick={() => onToggleFollow(p.id)}
                      className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 border border-slate-700 text-[11px] font-label-caps uppercase transition-colors"
                      title="Unfollow this protocol"
                    >
                      Following
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
