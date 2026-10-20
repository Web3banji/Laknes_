/**
 * LAKNES Quests View
 * Ecosystem-wide community quest discovery and participation.
 * Displays quest title, real project logo & name, description,
 * eligibility requirements, deadlines, rewards, and participation status.
 */

import React, { useState, useEffect } from 'react';
import { Quest, QuestType, Project } from '../../types/contracts.ts';
import { QuestCard } from '../common/QuestCard.tsx';
import { laknesClient } from '../../client/api-client.ts';

interface QuestsViewProps {
  onSelectQuest: (quest: Quest) => void;
  onNavigate: (view: string) => void;
  participatingQuestIds: Set<string>;
  savedQuestIds?: Set<string>;
  onToggleSaveQuest?: (questId: string, e: React.MouseEvent) => void;
}

export function QuestsView({
  onSelectQuest,
  onNavigate,
  participatingQuestIds,
  savedQuestIds,
  onToggleSaveQuest,
}: QuestsViewProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, Project>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [participationFilter, setParticipationFilter] = useState<'ALL' | 'ENROLLED' | 'AVAILABLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadQuests = async () => {
      setIsLoading(true);
      try {
        // Fetch verified projects first to map project names and logos
        const projects = await laknesClient.discoverProjects({ limit: 100 });
        const pMap: Record<string, Project> = {};
        for (const p of projects) {
          pMap[p.id] = p;
        }

        // Fetch quests for all projects
        const questPromises = projects.map((p) =>
          laknesClient.getProjectQuests(p.id).catch(() => [] as Quest[])
        );
        const questArrays = await Promise.all(questPromises);
        const allQuests = questArrays.flat();

        if (!cancelled) {
          setProjectsMap(pMap);
          setQuests(allQuests);
        }
      } catch (err) {
        console.error('Failed to load quests', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadQuests();
    return () => {
      cancelled = true;
    };
  }, []);

  const questTypes = [
    { id: 'ALL', label: 'All Types' },
    { id: QuestType.COMMUNITY, label: 'Website & Community' },
    { id: QuestType.FEEDBACK, label: 'Forms & Feedback' },
    { id: QuestType.SOCIAL, label: 'Social & Media' },
    { id: QuestType.DEVELOPER, label: 'Developer & Testnet' },
    { id: QuestType.ONCHAIN, label: 'On-Chain' },
  ];

  const filteredQuests = quests.filter((q) => {
    const matchType = selectedType === 'ALL' || q.questType === selectedType;
    const isEnrolled = participatingQuestIds.has(q.id);
    const matchParticipation =
      participationFilter === 'ALL' ||
      (participationFilter === 'ENROLLED' && isEnrolled) ||
      (participationFilter === 'AVAILABLE' && !isEnrolled);

    const projectName = projectsMap[q.projectId]?.name || '';
    const matchSearch =
      !searchQuery.trim() ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      projectName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchType && matchParticipation && matchSearch;
  });

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg mb-space-xl pb-space-lg border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-high w-fit mb-2">
            <span className="font-label-caps text-label-caps uppercase text-primary-fixed tracking-wider text-[11px]">
              Elysium Quests & Opportunities
            </span>
          </div>
          <h1 className="font-headline-xl text-3xl text-on-surface font-bold tracking-tight">
            Ecosystem Quests
          </h1>
          <p className="font-body-md text-on-surface-variant text-sm mt-1">
            Discover community bounties, explore websites, complete feedback forms, and participate without wallet constraints.
          </p>
        </div>

        <button
          onClick={() => onNavigate('projects')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-xs font-label-caps uppercase transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">folder_special</span>
          Browse Projects
        </button>
      </div>

      {/* Control Bar: Type Filters, Participation Toggle & Search */}
      <div className="flex flex-col lg:flex-row gap-space-md items-stretch lg:items-center justify-between mb-space-xl p-space-md bg-surface-container-low rounded-xl border border-slate-800">
        <div className="flex items-center gap-space-xs overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {questTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-label-caps uppercase transition-colors whitespace-nowrap ${
                selectedType === t.id
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Participation Filter */}
          <div className="flex bg-surface-container-lowest p-1 rounded-lg border border-slate-800 text-[11px] font-label-caps uppercase">
            <button
              type="button"
              onClick={() => setParticipationFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                participationFilter === 'ALL'
                  ? 'bg-surface-container-high text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({quests.length})
            </button>
            <button
              type="button"
              onClick={() => setParticipationFilter('ENROLLED')}
              className={`px-2.5 py-1 rounded transition-colors ${
                participationFilter === 'ENROLLED'
                  ? 'bg-surface-container-high text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Enrolled ({quests.filter((q) => participatingQuestIds.has(q.id)).length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quests or protocols..."
              className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-primary-container"
            />
          </div>
        </div>
      </div>

      {/* Quests Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-surface-container-low animate-pulse"></div>
          ))}
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="p-16 rounded-2xl bg-surface-container-low border border-slate-800 text-center flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">explore_off</span>
          <h3 className="text-base font-semibold text-on-surface mb-1">No Quests Match Filters</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mb-4">
            Try adjusting your search query or selecting a different quest type category.
          </p>
          <button
            onClick={() => {
              setSelectedType('ALL');
              setParticipationFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-xs uppercase font-label-caps"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {filteredQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              projectName={projectsMap[quest.projectId]?.name}
              projectLogo={projectsMap[quest.projectId]?.logoUrl}
              onSelect={onSelectQuest}
              isParticipating={participatingQuestIds.has(quest.id)}
              isSaved={savedQuestIds?.has(quest.id)}
              onToggleSave={onToggleSaveQuest}
            />
          ))}
        </div>
      )}
    </div>
  );
}
