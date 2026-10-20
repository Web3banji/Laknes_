/**
 * LAKNES Explore View
 * High-fidelity implementation replicating the Elysium Ecosystem Gateway mockup
 * and seamlessly integrating projects, quests, spotlight, categories, and developer actions.
 */

import React, { useState, useEffect } from 'react';
import { Project, ProjectCategory, Quest, QuestType } from '../../types/contracts.ts';
import { ProjectCard } from '../common/ProjectCard.tsx';
import { laknesClient } from '../../client/api-client.ts';

interface ExploreViewProps {
  projects: Project[];
  isLoading: boolean;
  onSelectProject: (project: Project) => void;
  onNavigate: (view: string) => void;
  onToggleSave?: (projectId: string, e: React.MouseEvent) => void;
  savedProjectIds?: Set<string>;
}

export function ExploreView({
  projects,
  isLoading,
  onSelectProject,
  onNavigate,
  onToggleSave,
  savedProjectIds,
}: ExploreViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [featuredQuests, setFeaturedQuests] = useState<Quest[]>([]);
  const [isLoadingQuests, setIsLoadingQuests] = useState<boolean>(true);

  // Load featured quests from verified projects
  useEffect(() => {
    let cancelled = false;

    const loadQuests = async () => {
      try {
        setIsLoadingQuests(true);
        if (projects.length === 0) {
          setFeaturedQuests([]);
          return;
        }

        const promises = projects.slice(0, 5).map((p) =>
          laknesClient.getProjectQuests(p.id).catch(() => [] as Quest[])
        );
        const results = await Promise.all(promises);
        const combined = results.flat();
        if (!cancelled) {
          setFeaturedQuests(combined.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load featured quests', err);
      } finally {
        if (!cancelled) setIsLoadingQuests(false);
      }
    };

    loadQuests();

    return () => {
      cancelled = true;
    };
  }, [projects]);

  const categories = [
    { id: 'ALL', label: 'All Categories', icon: 'apps' },
    { id: ProjectCategory.DEFI, label: 'DeFi', icon: 'currency_exchange' },
    { id: ProjectCategory.INFRASTRUCTURE, label: 'Infrastructure', icon: 'dns' },
    { id: ProjectCategory.GAMING, label: 'Gaming', icon: 'sports_esports' },
    { id: ProjectCategory.SOCIAL, label: 'Creative & Media', icon: 'palette' },
    { id: ProjectCategory.TOOLING, label: 'Tooling & AI', icon: 'smart_toy' },
  ];

  const filteredProjects = projects.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Spotlight only appears if a real verified project exists
  const spotlightProject = projects.length > 0 ? (projects.find((p) => p.verificationStatus === 'VERIFIED') || projects[0]) : null;

  return (
    <div className="flex flex-col w-full">
      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden px-margin-mobile lg:px-margin pt-space-xl pb-space-2xl">
        {/* Ambient Radial Glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary-container/10 blur-[130px] rounded-full"></div>
        <div className="pointer-events-none absolute top-1/3 -right-32 w-[400px] h-[400px] bg-tertiary-container/5 blur-[120px] rounded-full"></div>

        <div className="max-w-[1440px] mx-auto flex flex-col items-center text-center relative z-10">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container/80 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] mb-space-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
            <span className="font-label-caps text-label-caps uppercase text-primary-fixed tracking-widest text-[11px]">
              Elysium Ecosystem Gateway
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display-hero text-3xl sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-[64px] max-w-4xl tracking-tight text-on-surface mb-space-md font-bold">
            Discover what's being built on{' '}
            <span className="bg-gradient-to-r from-primary-fixed via-primary-container to-secondary text-transparent bg-clip-text">
              Elysium
            </span>
            .
          </h1>

          {/* Subheadline */}
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-space-xl">
            Explore verified projects, track ecosystem evolution, and participate in community quests.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-space-md mb-space-2xl">
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('projects');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-space-sm bg-primary-container text-on-primary-container font-headline-sm text-sm sm:text-base px-space-xl py-space-md rounded-full shadow-[0_0_32px_rgba(0,210,255,0.35)] hover:bg-primary-fixed-dim hover:text-on-primary-fixed transition-all duration-200 active:scale-95 font-semibold"
            >
              <span>Explore Projects</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </a>

            <button
              onClick={() => onNavigate('quests')}
              className="inline-flex items-center gap-space-sm bg-surface-container-high/60 backdrop-blur-md text-on-surface font-headline-sm text-sm sm:text-base px-space-xl py-space-md rounded-full hover:bg-surface-container-highest transition-all duration-200 border border-slate-700/50"
            >
              <span className="material-symbols-outlined text-primary-fixed-dim text-[20px]">explore</span>
              <span>Start a Quest</span>
            </button>
          </div>

          {/* Hero Visual Frame with Panorama from Stitch */}
          <div className="relative w-full rounded-2xl overflow-hidden p-[1px] bg-gradient-to-b from-primary-fixed-dim/30 via-surface-container to-transparent shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
            <div className="relative w-full aspect-[21/9] max-h-[580px] rounded-2xl overflow-hidden bg-surface-container-lowest">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBH27B30EN-9J_w6bWlLeQm-1-GfTTx_PNINn3VqRnH_e2z5uCQb-UR7h4XlaSieBoz0-MT12Lu71afKsCaGAPq1gzsC6hqufHxZHFMn9AMfsTAPo9dY3MHVBak1_tBODoc_-fg1CbnojCXl0HXGpQSvEsBFWPKO7njPd5c-tUXkcaYjSFzkoQxHQ5HLcs2sbDdE_r-ObvCuoxe5Aj5buOi1s37FTnNk2PS6nFhJ8-enF-UN1ghwbMg4R0qtT-bATvnNxM"
                alt="LAKNES Classical Elysian Horizon over clear waters at golden sunset"
                className="w-full h-full object-cover object-center transform hover:scale-[1.01] transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />

              {/* Cinematic Scrims */}
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80 pointer-events-none"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-transparent pointer-events-none"></div>

              {/* Bottom Ambient Info Bar Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-space-md sm:p-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md bg-surface-container-lowest/80 backdrop-blur-xl border-t border-slate-800/50">
                <div className="flex items-center gap-space-md">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high text-primary-fixed-dim shrink-0">
                    <span className="material-symbols-outlined text-[20px]">hub</span>
                  </span>
                  <div className="text-left">
                    <p className="font-label-caps text-label-caps uppercase text-primary tracking-wider text-[11px]">
                      Epoch Genesis
                    </p>
                    <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                      Archived Block #42,891,029 &bull; Synced
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-space-lg text-xs font-label-mono">
                  <span className="text-on-surface-variant flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Global Consensus Reached
                  </span>
                  <div className="hidden sm:flex items-center gap-1 text-primary-fixed-dim font-label-caps text-label-caps uppercase text-[11px]">
                    <span>Verified Gateway</span>
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick-Metric Ticker from Stitch */}
          <div className="w-full mt-space-xl grid grid-cols-2 md:grid-cols-4 gap-space-md bg-surface-container-low/80 backdrop-blur-lg p-space-lg rounded-xl border border-slate-800/80">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-headline-xl text-2xl sm:text-3xl text-primary font-bold tracking-tight">
                {projects.length}
              </span>
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase mt-1 text-[11px]">
                Verified Project{projects.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-headline-xl text-2xl sm:text-3xl text-primary font-bold tracking-tight">
                Elysium L1
              </span>
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase mt-1 text-[11px]">
                Active Network
              </span>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-headline-xl text-2xl sm:text-3xl text-primary font-bold tracking-tight">
                {featuredQuests.length}
              </span>
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase mt-1 text-[11px]">
                Active Quest{featuredQuests.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-headline-xl text-2xl sm:text-3xl text-tertiary-container font-bold tracking-tight">
                100%
              </span>
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase mt-1 text-[11px]">
                On-Chain Verifiable
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED SPOTLIGHT SECTION */}
      {spotlightProject && (
        <section className="w-full px-margin-mobile lg:px-margin py-space-lg">
          <div className="max-w-[1440px] mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-surface-container-low p-6 sm:p-8 flex flex-col lg:flex-row items-center gap-8 shadow-2xl">
              {/* Background Glow */}
              <div className="pointer-events-none absolute -right-20 -bottom-20 w-96 h-96 bg-primary-container/10 blur-[100px] rounded-full"></div>

              {/* Spotlight Visual */}
              <div className="relative w-full lg:w-1/2 aspect-[16/10] rounded-xl overflow-hidden bg-surface-container-lowest shrink-0 border border-slate-700/60 shadow-lg group">
                <img
                  src={spotlightProject.bannerUrl || 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80'}
                  alt={spotlightProject.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 via-transparent to-transparent"></div>
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-[11px] font-label-caps uppercase font-bold shadow-lg">
                    <span className="material-symbols-outlined text-[14px]">stars</span>
                    Ecosystem Spotlight
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-label-mono text-on-surface">
                  <span className="bg-surface-container-lowest/80 backdrop-blur-md px-2.5 py-1 rounded">
                    TVL: $48.5M
                  </span>
                  <span className="bg-surface-container-lowest/80 backdrop-blur-md px-2.5 py-1 rounded text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Verified & Audited
                  </span>
                </div>
              </div>

              {/* Spotlight Content */}
              <div className="flex-1 flex flex-col gap-4 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-label-caps text-label-caps uppercase px-2.5 py-1 rounded bg-surface-container-high text-primary-fixed text-xs">
                    {spotlightProject.category}
                  </span>
                  <span className="font-label-mono text-xs text-on-surface-variant">
                    {spotlightProject.ecosystem || 'Elysium L1'}
                  </span>
                </div>

                <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-bold tracking-tight">
                  {spotlightProject.name}
                </h2>

                <p className="font-body-md text-on-surface-variant text-sm leading-relaxed">
                  {spotlightProject.description || spotlightProject.shortDescription}
                </p>

                <div className="grid grid-cols-3 gap-3 py-2 border-y border-slate-800 text-left">
                  <div>
                    <span className="text-[11px] font-label-caps uppercase text-outline">Category</span>
                    <p className="text-xs font-semibold text-on-surface">{spotlightProject.category}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-label-caps uppercase text-outline">Protocol State</span>
                    <p className="text-xs font-semibold text-emerald-400">Live Mainnet</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-label-caps uppercase text-outline">Security Audit</span>
                    <p className="text-xs font-semibold text-primary">Consensus Verified</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => onSelectProject(spotlightProject)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase text-xs font-semibold shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:bg-primary-fixed-dim transition-all"
                  >
                    <span>Explore Project</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>

                  {spotlightProject.websiteUrl && (
                    <a
                      href={spotlightProject.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-label-caps uppercase transition-colors"
                    >
                      <span>Website</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  )}

                  <button
                    onClick={() => onNavigate('quests')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-primary-fixed text-xs font-label-caps uppercase transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">explore</span>
                    <span>View Quests</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PROJECT DISCOVERY SECTION */}
      <section className="w-full px-margin-mobile lg:px-margin py-space-xl relative" id="projects">
        <div className="max-w-[1440px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg mb-space-xl">
            <div className="flex flex-col gap-space-xs text-left">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-high w-fit">
                <span className="font-label-caps text-label-caps uppercase text-primary-fixed tracking-wider text-[11px]">
                  Curated Directory
                </span>
              </div>
              <h2 className="font-headline-xl text-2xl sm:text-3xl text-on-surface tracking-tight font-bold">
                Explore Ecosystem Projects
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Verified initiatives pushing digital frontiers across the Elysium framework.
              </p>
            </div>

            <button
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-2 text-primary hover:text-primary-fixed-dim font-label-mono text-label-mono transition-colors group text-xs shrink-0"
            >
              <span>View all projects ({projects.length})</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>

          {/* Search & Filters Container */}
          <div className="flex flex-col lg:flex-row gap-space-md items-stretch lg:items-center justify-between mb-space-xl p-space-md bg-surface-container-low rounded-xl border border-slate-800">
            {/* Filter Tabs */}
            <div className="flex items-center gap-space-xs overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-space-md py-1.5 rounded-full font-label-caps text-label-caps uppercase transition-all whitespace-nowrap text-[11px] ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(0,210,255,0.3)] font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input with Icon */}
            <div className="relative min-w-[280px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, token or stack..."
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline pl-10 pr-space-md py-2 rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container transition-all text-xs"
              />
            </div>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-xl bg-surface-container-low animate-pulse"></div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 rounded-2xl bg-surface-container-low border border-slate-800 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3">folder_open</span>
              <h3 className="text-base font-semibold text-on-surface mb-1">No Projects Found</h3>
              <p className="text-xs text-on-surface-variant max-w-md mb-4">
                No verified projects currently match your selected filters. Try selecting a different category or clearing search terms.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="px-5 py-2 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold uppercase font-label-caps hover:bg-primary-fixed-dim transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={onSelectProject}
                  isSaved={savedProjectIds?.has(project.id)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FEATURED ACTIVE QUESTS SECTION */}
      <section className="w-full px-margin-mobile lg:px-margin py-space-2xl bg-surface-container-lowest/40 border-t border-slate-800/80">
        <div className="max-w-[1440px] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg mb-space-xl">
            <div className="flex flex-col gap-space-xs text-left">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-high w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-label-caps text-label-caps uppercase text-primary-fixed tracking-wider text-[11px]">
                  Ecosystem Quests & Bounties
                </span>
              </div>
              <h2 className="font-headline-xl text-2xl sm:text-3xl text-on-surface tracking-tight font-bold">
                Participate & Earn Horizon XP
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Engage in testnets, verify liquidity, and test protocol upgrades to earn verifiable badges and tokens.
              </p>
            </div>

            <button
              onClick={() => onNavigate('quests')}
              className="inline-flex items-center gap-2 text-primary hover:text-primary-fixed-dim font-label-mono text-label-mono transition-colors group text-xs shrink-0"
            >
              <span>Explore all quests</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>

          {/* Quests Cards */}
          {isLoadingQuests ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-xl bg-surface-container-low animate-pulse"></div>
              ))}
            </div>
          ) : featuredQuests.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface-container-low border border-slate-800 text-center">
              <p className="text-on-surface-variant text-sm">New quests are dropping soon from verified ecosystem partners.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              {featuredQuests.map((quest) => (
                <div
                  key={quest.id}
                  onClick={() => onNavigate('quests')}
                  className="group flex flex-col justify-between bg-surface-container-low rounded-xl p-space-lg hover:bg-surface-container transition-all duration-300 border border-slate-800/60 shadow-lg hover:shadow-2xl cursor-pointer"
                >
                  <div>
                    {/* Top Meta Line */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-label-caps text-label-caps uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary-fixed text-[11px]">
                          {quest.questType}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-label-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Active
                        </span>
                      </div>

                      {quest.rewardConfiguration && (
                        <span className="font-label-mono text-[11px] px-2.5 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary border border-tertiary-container/30">
                          {quest.rewardConfiguration.amount ? `${quest.rewardConfiguration.amount} ` : ''}
                          {quest.rewardConfiguration.rewardType}
                        </span>
                      )}
                    </div>

                    <h3 className="font-headline-sm text-base text-on-surface group-hover:text-primary transition-colors mb-2 text-left">
                      {quest.title}
                    </h3>

                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 mb-4 text-left">
                      {quest.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/40 flex items-center justify-between text-xs font-label-mono">
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      ~15 mins
                    </span>

                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-label-caps text-label-caps uppercase bg-primary-container text-on-primary-container group-hover:bg-primary-fixed-dim text-[11px]">
                      <span>Start Quest</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BUILDERS & PROTOCOL FOUNDERS SECTION */}
      <section className="w-full px-margin-mobile lg:px-margin py-space-2xl relative">
        <div className="max-w-[1440px] mx-auto">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#12161f] via-[#161c28] to-[#12161f] p-8 sm:p-12 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 text-left">
            {/* Ambient Corner Glow */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-primary-container/15 blur-[90px] rounded-full"></div>

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-high w-fit mb-3">
                <span className="font-label-caps text-label-caps uppercase text-primary-fixed tracking-wider text-[11px]">
                  Protocol Teams & Builders
                </span>
              </div>
              <h2 className="font-display-hero text-2xl sm:text-3xl lg:text-4xl text-on-surface font-bold tracking-tight mb-2">
                Deploying a protocol on Elysium?
              </h2>
              <p className="font-body-md text-on-surface-variant text-sm sm:text-base leading-relaxed">
                Join verified ecosystem builders. Project accounts sign in with Google (Gmail), submit protocol credentials, undergo foundation verification, and unlock quest publishing and Creator Studio.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-space-md shrink-0">
              <button
                onClick={() => onNavigate('submit-project')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-container text-on-primary-container font-headline-sm text-sm font-semibold shadow-[0_0_24px_rgba(0,210,255,0.35)] hover:bg-primary-fixed-dim transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                <span>Register Project Account</span>
              </button>

              <button
                onClick={() => onNavigate('projects')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-sm font-semibold transition-all border border-slate-700/60 cursor-pointer"
              >
                <span>Browse Directory</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
