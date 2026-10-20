/**
 * LAKNES Standardized Project Card
 * Direct implementation of Google Stitch Project Card specifications.
 */

import React, { useState } from 'react';
import { Project, ProjectVerificationStatus } from '../../types/contracts.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  isSaved?: boolean;
  onToggleSave?: (projectId: string, e: React.MouseEvent) => void;
}

export function ProjectCard({ project, onSelect, isSaved, onToggleSave }: ProjectCardProps) {
  const [imgError, setImgError] = useState(false);

  // Fallback banner generator based on category
  const fallbackGradient = 'bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest';

  return (
    <div
      onClick={() => onSelect(project)}
      className="group flex flex-col bg-surface-container-low rounded-xl overflow-hidden hover:bg-surface-container transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 cursor-pointer border border-slate-800/60"
    >
      {/* Visual Frame */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-surface-container-lowest">
        {project.bannerUrl && !imgError ? (
          <img
            src={project.bannerUrl}
            alt={project.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${fallbackGradient}`}>
            <span className="w-12 h-12 rounded-xl bg-surface-container-high text-primary-fixed-dim flex items-center justify-center mb-2 shadow-inner">
              <span className="material-symbols-outlined text-[28px]">token</span>
            </span>
            <span className="font-headline-sm text-sm text-on-surface font-semibold tracking-wide">{project.name}</span>
          </div>
        )}

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent pointer-events-none"></div>

        {/* Top Badges */}
        <div className="absolute top-space-md left-space-md">
          <span className="inline-flex items-center gap-1 font-label-caps text-label-caps uppercase px-space-sm py-1 rounded bg-surface-container-lowest/80 backdrop-blur-md text-primary text-[11px]">
            <span className="material-symbols-outlined text-[14px]">
              {project.category === 'DEFI'
                ? 'currency_exchange'
                : project.category === 'INFRASTRUCTURE'
                ? 'dns'
                : project.category === 'GAMING'
                ? 'sports_esports'
                : project.category === 'SOCIAL'
                ? 'palette'
                : project.category === 'TOOLING'
                ? 'smart_toy'
                : 'bolt'}
            </span>
            {project.category}
          </span>
        </div>

        <div className="absolute top-space-md right-space-md flex items-center gap-1">
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(project.id, e);
              }}
              className="p-1.5 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface-variant hover:text-primary transition-colors"
              title={isSaved ? 'Remove from saved' : 'Save project'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isSaved ? 'bookmark_added' : 'bookmark'}
              </span>
            </button>
          )}
          <StatusBadge status={project.verificationStatus} />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-space-lg flex flex-col flex-grow justify-between gap-space-md">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors truncate">
                {project.name}
              </h3>
              {project.verificationStatus === ProjectVerificationStatus.VERIFIED && (
                <span
                  className="material-symbols-outlined text-[18px] text-emerald-400 shrink-0 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  title="Verified Checkmark: Officially reviewed and approved by Laknes team"
                >
                  verified
                </span>
              )}
            </div>
            {project.ecosystem && (
              <span className="font-label-mono text-label-mono text-primary font-semibold shrink-0 text-xs">
                {project.ecosystem}
              </span>
            )}
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 line-clamp-2">
            {project.shortDescription}
          </p>
        </div>

        <div className="pt-space-sm flex items-center justify-between border-t border-slate-800/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-container"></span>
            <span className="font-label-mono text-label-mono text-on-surface-variant text-[11px]">
              {project.verificationStatus === ProjectVerificationStatus.VERIFIED ? 'Verified Project' : 'Pending Review'}
            </span>
          </div>

          <button className="inline-flex items-center gap-1 px-space-md py-1.5 rounded-full bg-surface-container-high text-on-surface group-hover:bg-primary-container group-hover:text-on-primary-container font-label-caps text-label-caps uppercase transition-all duration-200">
            <span>View Project</span>
            <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
