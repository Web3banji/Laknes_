/**
 * LAKNES Standardized Quest Card
 * Adheres to Stitch design system with rewards, deadlines, task types, and action triggers.
 */

import React from 'react';
import { Quest } from '../../types/contracts.ts';

interface QuestCardProps {
  quest: Quest;
  projectName?: string;
  projectLogo?: string;
  onSelect: (quest: Quest) => void;
  isParticipating?: boolean;
  participationStatus?: string;
  isSaved?: boolean;
  onToggleSave?: (questId: string, e: React.MouseEvent) => void;
}

export function QuestCard({
  quest,
  projectName,
  projectLogo,
  onSelect,
  isParticipating,
  participationStatus,
  isSaved,
  onToggleSave,
}: QuestCardProps) {
  const isExpired = Boolean(quest.deadline && new Date(quest.deadline).getTime() < Date.now());

  return (
    <div
      onClick={() => onSelect(quest)}
      className="group flex flex-col justify-between bg-surface-container-low rounded-xl p-space-lg hover:bg-surface-container transition-all duration-300 shadow-lg hover:shadow-2xl border border-slate-800/80 cursor-pointer relative"
    >
      <div>
        {/* Top Meta Line: Project Info, Quest Type & Save Button */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {projectLogo ? (
              <img
                src={projectLogo}
                alt={projectName || 'Project'}
                className="w-7 h-7 rounded-lg object-cover border border-slate-700/60 shrink-0 bg-surface-container-high"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-surface-container-high border border-slate-700/60 flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-[15px]">token</span>
              </div>
            )}
            <div className="min-w-0">
              {projectName && (
                <span className="text-xs text-on-surface font-semibold truncate block">
                  {projectName}
                </span>
              )}
              <span className="font-label-caps text-[10px] uppercase text-primary-fixed tracking-wider">
                {quest.questType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {quest.rewardConfiguration && (
              <span className="font-label-mono text-[11px] px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary border border-tertiary-container/30">
                {quest.rewardConfiguration.amount ? `${quest.rewardConfiguration.amount} ` : ''}
                {quest.rewardConfiguration.rewardType}
              </span>
            )}

            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(quest.id, e);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSaved
                    ? 'text-primary bg-primary-container/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
                title={isSaved ? 'Remove from Saved Quests' : 'Save Quest'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isSaved ? 'bookmark' : 'bookmark_border'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Quest Title */}
        <h3 className="font-headline-sm text-base text-on-surface group-hover:text-primary transition-colors mb-2 font-bold leading-snug">
          {quest.title}
        </h3>

        {/* Description */}
        <p className="font-body-sm text-xs text-on-surface-variant line-clamp-3 mb-4 leading-relaxed">
          {quest.description}
        </p>

        {/* Eligibility Rule Tag if present */}
        {quest.eligibilityRules?.ecosystemSpecificCondition && (
          <div className="mb-3 px-2.5 py-1 rounded-md bg-surface-container-lowest/80 border border-slate-800 text-[10px] text-slate-400 font-label-mono flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[13px] text-primary">rule</span>
            <span className="truncate">{quest.eligibilityRules.ecosystemSpecificCondition}</span>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-label-mono">
        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span>{quest.deadline ? `Due ${new Date(quest.deadline).toLocaleDateString()}` : 'Continuous'}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(quest);
          }}
          disabled={isExpired}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-label-caps text-label-caps uppercase transition-all text-xs font-semibold ${
            participationStatus === 'VERIFIED'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
              : participationStatus === 'PENDING_VERIFICATION'
              ? 'bg-amber-950/70 text-amber-300 border border-amber-700'
              : isParticipating
              ? 'bg-primary-container/20 text-primary border border-primary-container/50'
              : isExpired
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-primary-container text-on-primary-container group-hover:bg-primary-fixed-dim'
          }`}
        >
          <span>
            {participationStatus === 'VERIFIED'
              ? 'Verified'
              : participationStatus === 'PENDING_VERIFICATION'
              ? 'In Review'
              : isParticipating
              ? 'In Progress'
              : isExpired
              ? 'Expired'
              : 'Start Quest'}
          </span>
          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
