/**
 * LAKNES Projects Directory View
 * Searchable, filterable ecosystem project directory adhering to Stitch design system.
 */

import React, { useState } from 'react';
import { Project, ProjectCategory } from '../../types/contracts.ts';
import { ProjectCard } from '../common/ProjectCard.tsx';

interface ProjectsViewProps {
  projects: Project[];
  isLoading: boolean;
  onSelectProject: (project: Project) => void;
  onNavigate: (view: string) => void;
  onToggleSave?: (projectId: string, e: React.MouseEvent) => void;
  savedProjectIds?: Set<string>;
}

export function ProjectsView({
  projects,
  isLoading,
  onSelectProject,
  onNavigate,
  onToggleSave,
  savedProjectIds,
}: ProjectsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'name'>('newest');

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: ProjectCategory.DEFI, label: 'DeFi' },
    { id: ProjectCategory.INFRASTRUCTURE, label: 'Infrastructure' },
    { id: ProjectCategory.GAMING, label: 'Gaming' },
    { id: ProjectCategory.SOCIAL, label: 'Social & Media' },
    { id: ProjectCategory.NFT_METAVERSE, label: 'NFT & Metaverse' },
    { id: ProjectCategory.TOOLING, label: 'Tooling & AI' },
  ];

  let filtered = projects.filter((p) => {
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchQuery =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  if (sortBy === 'name') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg mb-space-xl pb-space-lg border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-high w-fit mb-2">
            <span className="font-label-caps text-label-caps uppercase text-primary-fixed tracking-wider text-[11px]">
              Ecosystem Index
            </span>
          </div>
          <h1 className="font-headline-xl text-3xl text-on-surface font-bold tracking-tight">
            Verified Projects
          </h1>
          <p className="font-body-md text-on-surface-variant text-sm mt-1">
            Browse verified protocols, decentralized applications, and tools building on Elysium.
          </p>
        </div>

        <button
          onClick={() => onNavigate('submit-project')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase text-xs font-semibold shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:bg-primary-fixed-dim shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Submit New Project
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-space-md items-stretch lg:items-center justify-between mb-space-xl p-space-md bg-surface-container-low rounded-xl border border-slate-800">
        {/* Categories */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-label-caps uppercase transition-colors whitespace-nowrap ${
                selectedCategory === c.id
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-primary-container"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-2.5 py-1.5 border border-outline-variant/30 focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-xl bg-surface-container-low animate-pulse"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 rounded-2xl bg-surface-container-low border border-slate-800 text-center flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">search_off</span>
          <h3 className="text-base font-semibold text-on-surface mb-1">No Projects Match Criteria</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mb-4">
            Try adjusting your search query or selecting a different category.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-1.5 rounded-full bg-surface-container-high text-xs text-on-surface hover:bg-surface-container-highest"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {filtered.map((project) => (
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
  );
}
