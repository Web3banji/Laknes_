/**
 * LAKNES Platform Main Application
 * Flagship Google Stitch implementation integrating the Elysium ecosystem hub,
 * project directory, quests system, representative management, and admin reviews.
 * Features unified role-aware architecture with User and Project workspaces.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './client/hooks/useAuth.ts';
import { laknesClient } from './client/api-client.ts';
import { Project, Quest, ContentReportTargetType, UserRole } from './types/contracts.ts';

// Common Components
import { Navbar } from './components/common/Navbar.tsx';
import { Footer } from './components/common/Footer.tsx';
import { AuthModal } from './components/common/AuthModal.tsx';
import { ReportModal } from './components/common/ReportModal.tsx';
import { ArchitectureModal } from './components/common/ArchitectureModal.tsx';

// User Views
import { ExploreView } from './components/views/ExploreView.tsx';
import { ProjectsView } from './components/views/ProjectsView.tsx';
import { QuestsView } from './components/views/QuestsView.tsx';
import { FollowingView } from './components/views/FollowingView.tsx';
import { ProfileView } from './components/views/ProfileView.tsx';
import { SubmitProjectView } from './components/views/SubmitProjectView.tsx';
import { AdminView } from './components/views/AdminView.tsx';

// Project Workspace View
import { ProjectWorkspaceView } from './components/views/ProjectWorkspaceView.tsx';

// Modals
import { ProjectDetailModal } from './components/views/ProjectDetailModal.tsx';
import { QuestDetailModal } from './components/views/QuestDetailModal.tsx';

export default function App() {
  const auth = useAuth();

  // Workspace & Navigation State
  const [workspace, setWorkspace] = useState<'user' | 'project'>('user');
  const [currentView, setCurrentView] = useState<string>('explore');
  const [currentProjectTab, setCurrentProjectTab] = useState<
    'overview' | 'my-project' | 'quests' | 'audience' | 'creator-studio' | 'settings'
  >('overview');

  // Core Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
  const [userProjects, setUserProjects] = useState<Array<Project & { myMembershipRole?: string }>>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // User Engagements
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());
  const [savedQuestIds, setSavedQuestIds] = useState<Set<string>>(new Set());
  const [followedProjectIds, setFollowedProjectIds] = useState<Set<string>>(new Set());
  const [participatingQuestIds, setParticipatingQuestIds] = useState<Set<string>>(new Set());

  // Interactive Modals State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalAccountType, setAuthModalAccountType] = useState<'user' | 'project'>('user');

  const [architectureModalOpen, setArchitectureModalOpen] = useState(false);

  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    targetType: ContentReportTargetType;
    targetId: string;
    targetName: string;
  }>({
    isOpen: false,
    targetType: ContentReportTargetType.PROJECT,
    targetId: '',
    targetName: '',
  });

  // Load public verified projects
  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const data = await laknesClient.discoverProjects({ limit: 100 });
      setProjects(data);
    } catch (err) {
      console.error('Failed to discover projects', err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  // Load user's managed projects
  const loadUserProjects = useCallback(async () => {
    if (!auth.user) {
      setUserProjects([]);
      return;
    }
    try {
      const projs = await laknesClient.getUserProjects(auth.user.id);
      setUserProjects(projs);
      if (projs.length > 0 && !activeProjectId) {
        setActiveProjectId(projs[0].id);
      }
    } catch (err) {
      console.error('Failed to load user projects', err);
    }
  }, [auth.user, activeProjectId]);

  // Load user engagements when authenticated
  const loadUserEngagements = useCallback(async () => {
    if (!auth.user) {
      setSavedProjectIds(new Set());
      setSavedQuestIds(new Set());
      setFollowedProjectIds(new Set());
      setParticipatingQuestIds(new Set());
      return;
    }

    try {
      const [saved, follows, quests, savedQ] = await Promise.all([
        laknesClient.getUserSavedProjects(auth.user.id).catch(() => []),
        laknesClient.getUserFollows(auth.user.id).catch(() => []),
        laknesClient.getUserQuests(auth.user.id).catch(() => []),
        laknesClient.getUserSavedQuests(auth.user.id).catch(() => []),
      ]);

      setSavedProjectIds(new Set(saved.map((p: Project) => p.id)));
      setSavedQuestIds(new Set(savedQ.map((q: any) => q.id)));
      setFollowedProjectIds(new Set(follows.map((p: Project) => p.id)));
      setParticipatingQuestIds(new Set(quests.map((q: any) => q.questId)));
    } catch (err) {
      console.error('Failed to load user engagements', err);
    }
  }, [auth.user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadUserEngagements();
    loadUserProjects();
  }, [loadUserEngagements, loadUserProjects]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, currentProjectTab, workspace]);

  // Workspace Switcher
  const handleSwitchWorkspace = (
    targetWorkspace: 'user' | 'project',
    targetProjectId?: string
  ) => {
    if (targetWorkspace === 'project') {
      const pId = targetProjectId || activeProjectId || (userProjects.length > 0 ? userProjects[0].id : null);
      if (pId) {
        setActiveProjectId(pId);
        setWorkspace('project');
        setCurrentProjectTab('overview');
        setCurrentView('project-overview');
      } else {
        // No project yet -> direct to submit project
        setWorkspace('user');
        setCurrentView('submit-project');
      }
    } else {
      setWorkspace('user');
      if (currentView.startsWith('project-')) {
        setCurrentView('explore');
      }
    }
  };

  // Generalized Navigation handler
  const handleNavigate = (view: string) => {
    if (view.startsWith('project-')) {
      const tab = view.replace('project-', '') as
        | 'overview'
        | 'my-project'
        | 'quests'
        | 'audience'
        | 'creator-studio'
        | 'settings';
      setWorkspace('project');
      setCurrentProjectTab(tab === ('overview' as any) ? 'overview' : tab);
      setCurrentView(view);
    } else {
      setWorkspace('user');
      setCurrentView(view);
    }
  };

  // Auth Modal Triggers
  const handleOpenAuth = (
    mode: 'login' | 'register' = 'login',
    accountType: 'user' | 'project' = 'user'
  ) => {
    setAuthModalMode(mode);
    setAuthModalAccountType(accountType);
    setAuthModalOpen(true);
  };

  // Engagement Handlers
  const handleToggleSave = async (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!auth.isAuthenticated) {
      handleOpenAuth('login');
      return;
    }

    try {
      const isCurrentlySaved = savedProjectIds.has(projectId);
      await laknesClient.saveProject(projectId);
      setSavedProjectIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) {
          next.delete(projectId);
        } else {
          next.add(projectId);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle save project', err);
    }
  };

  const handleToggleSaveQuest = async (questId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!auth.isAuthenticated) {
      handleOpenAuth('login');
      return;
    }

    try {
      const isCurrentlySaved = savedQuestIds.has(questId);
      if (isCurrentlySaved) {
        await laknesClient.unsaveQuest(questId);
      } else {
        await laknesClient.saveQuest(questId);
      }
      setSavedQuestIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) {
          next.delete(questId);
        } else {
          next.add(questId);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle save quest', err);
    }
  };

  const handleToggleFollow = async (projectId: string) => {
    if (!auth.isAuthenticated) {
      handleOpenAuth('login');
      return;
    }

    try {
      const isCurrentlyFollowed = followedProjectIds.has(projectId);
      await laknesClient.followProject(projectId);
      setFollowedProjectIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFollowed) {
          next.delete(projectId);
        } else {
          next.add(projectId);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle follow project', err);
    }
  };

  const handleOpenReport = (type: ContentReportTargetType, id: string, name: string) => {
    setReportModalData({
      isOpen: true,
      targetType: type,
      targetId: id,
      targetName: name,
    });
  };

  const handleSubmitReport = async (
    targetType: ContentReportTargetType,
    targetId: string,
    reason: string
  ) => {
    await laknesClient.submitReport({ targetType, targetId, reason });
  };

  const isUserRepresentative = (project: Project | null) => {
    if (!project || !auth.user) return false;
    if (auth.user.roles.includes(UserRole.ADMIN)) return true;
    return userProjects.some((up) => up.id === project.id);
  };

  // Active Project Reference
  const activeProject =
    userProjects.find((p) => p.id === activeProjectId) ||
    projects.find((p) => p.id === activeProjectId) ||
    (userProjects.length > 0 ? userProjects[0] : null);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Role-Aware Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        user={auth.user}
        workspace={workspace}
        activeProject={activeProject}
        userProjects={userProjects}
        onSwitchWorkspace={handleSwitchWorkspace}
        onOpenAuth={handleOpenAuth}
        onLogout={() => {
          auth.logout();
          setWorkspace('user');
          setCurrentView('explore');
        }}
        onOpenArchitecture={() => setArchitectureModalOpen(true)}
      />

      {/* Main View Area (offset for fixed 80px Navbar) */}
      <main className="flex-1 pt-20 flex flex-col">
        {/* ==================================================== */}
        {/* PROJECT WORKSPACE */}
        {/* ==================================================== */}
        {workspace === 'project' && activeProject && (
          <ProjectWorkspaceView
            projectId={activeProject.id}
            user={auth.user!}
            activeTab={currentProjectTab}
            onTabChange={(tab) => {
              setCurrentProjectTab(tab);
              setCurrentView(`project-${tab === 'overview' ? 'overview' : tab}`);
            }}
            onSwitchToUserWorkspace={() => handleSwitchWorkspace('user')}
            onSelectOtherProject={(id) => {
              setActiveProjectId(id);
              setCurrentProjectTab('overview');
              setCurrentView('project-overview');
            }}
            userProjects={userProjects}
            onNavigateToSubmitNewProject={() => {
              setWorkspace('user');
              setCurrentView('submit-project');
            }}
            onProjectUpdated={() => {
              loadProjects();
              loadUserProjects();
            }}
          />
        )}

        {/* Fallback if in project workspace but no project exists */}
        {workspace === 'project' && !activeProject && (
          <div className="w-full max-w-2xl mx-auto px-margin-mobile py-24 text-center">
            <div className="p-10 rounded-3xl bg-[#141820] border border-slate-800 flex flex-col items-center shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                <span className="material-symbols-outlined text-4xl">shield_person</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Project Account Required</h2>
              <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
                Project workspaces are reserved for verified protocol representatives.
                If you are a founder or protocol team, sign in with your project Google (Gmail) or submit your credentials for review.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => handleOpenAuth('login', 'project')}
                  className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-bold text-xs shadow-md hover:bg-primary-fixed-dim transition-all cursor-pointer"
                >
                  Sign In as Project Account
                </button>
                <button
                  onClick={() => {
                    setWorkspace('user');
                    setCurrentView('explore');
                  }}
                  className="px-6 py-2.5 rounded-full bg-slate-800 text-slate-300 hover:text-white font-label-caps uppercase text-xs transition-colors cursor-pointer"
                >
                  Return to Explorer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* USER WORKSPACE VIEWS */}
        {/* ==================================================== */}
        {workspace === 'user' && (
          <>
            {currentView === 'explore' && (
              <ExploreView
                projects={projects}
                isLoading={isLoadingProjects}
                onSelectProject={(project) => setSelectedProject(project)}
                onNavigate={handleNavigate}
                onToggleSave={handleToggleSave}
                savedProjectIds={savedProjectIds}
              />
            )}

            {currentView === 'projects' && (
              <ProjectsView
                projects={projects}
                isLoading={isLoadingProjects}
                onSelectProject={(project) => setSelectedProject(project)}
                onNavigate={handleNavigate}
                onToggleSave={handleToggleSave}
                savedProjectIds={savedProjectIds}
              />
            )}

            {currentView === 'quests' && (
              <QuestsView
                onSelectQuest={(quest) => setSelectedQuest(quest)}
                onNavigate={handleNavigate}
                participatingQuestIds={participatingQuestIds}
                savedQuestIds={savedQuestIds}
                onToggleSaveQuest={handleToggleSaveQuest}
              />
            )}

            {currentView === 'following' && (
              <FollowingView
                user={auth.user}
                onNavigate={handleNavigate}
                onOpenAuth={handleOpenAuth}
                onSelectProject={(project) => setSelectedProject(project)}
                onSelectQuest={(quest) => setSelectedQuest(quest)}
                onToggleFollow={handleToggleFollow}
                followedProjectIds={followedProjectIds}
                savedProjectIds={savedProjectIds}
                savedQuestIds={savedQuestIds}
                onToggleSave={handleToggleSave}
                onToggleSaveQuest={handleToggleSaveQuest}
              />
            )}

            {(currentView === 'user-dashboard' || currentView === 'profile') && (
              <ProfileView
                user={auth.user}
                onNavigate={handleNavigate}
                onOpenAuth={handleOpenAuth}
                onSelectProject={(project) => setSelectedProject(project)}
                onSelectQuest={(quest) => setSelectedQuest(quest)}
                onLogout={() => auth.logout()}
                onUserUpdated={() => auth.refreshUser()}
                onSwitchToProjectWorkspace={(projectId) => handleSwitchWorkspace('project', projectId)}
                onOpenDashboard={(projectId) => handleSwitchWorkspace('project', projectId)}
              />
            )}

            {currentView === 'submit-project' && (
              <SubmitProjectView
                user={auth.user}
                onNavigate={handleNavigate}
                onOpenAuth={handleOpenAuth}
                onProjectSubmitted={(id) => {
                  loadProjects();
                  loadUserProjects();
                  handleSwitchWorkspace('project', id);
                }}
              />
            )}

            {currentView === 'admin' && (
              <AdminView
                user={auth.user}
                onNavigate={handleNavigate}
                onSelectProject={(project) => setSelectedProject(project)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenArchitecture={() => setArchitectureModalOpen(true)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        initialAccountType={authModalAccountType}
        onClose={() => setAuthModalOpen(false)}
        onLogin={async (email, password) => {
          return await auth.login(email, password);
        }}
        onRegister={async (username, email, password, bio) => {
          return await auth.register(username, email, password, bio);
        }}
        onGoogleLogin={async (payload) => {
          return await auth.loginWithGoogle(payload);
        }}
        onOpenProjectDashboard={(id) => handleSwitchWorkspace('project', id)}
        onNavigateToProjectOnboarding={() => {
          setWorkspace('user');
          setCurrentView('submit-project');
        }}
        onUserSuccess={() => {
          loadUserEngagements();
          loadUserProjects();
        }}
      />

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        isFollowing={selectedProject ? followedProjectIds.has(selectedProject.id) : false}
        isSaved={selectedProject ? savedProjectIds.has(selectedProject.id) : false}
        onToggleFollow={handleToggleFollow}
        onToggleSave={(id) => handleToggleSave(id)}
        onOpenReport={handleOpenReport}
        onOpenDashboard={(id) => handleSwitchWorkspace('project', id)}
        isRepresentative={isUserRepresentative(selectedProject)}
      />

      {/* Quest Detail Modal */}
      <QuestDetailModal
        quest={selectedQuest}
        onClose={() => setSelectedQuest(null)}
        user={auth.user}
        onOpenAuth={handleOpenAuth}
        isSaved={selectedQuest ? savedQuestIds.has(selectedQuest.id) : false}
        onToggleSave={handleToggleSaveQuest}
        onParticipationUpdated={() => {
          loadUserEngagements();
        }}
      />

      {/* Community Report Modal */}
      <ReportModal
        isOpen={reportModalData.isOpen}
        targetType={reportModalData.targetType}
        targetId={reportModalData.targetId}
        targetName={reportModalData.targetName}
        onClose={() => setReportModalData((prev) => ({ ...prev, isOpen: false }))}
        onSubmitReport={handleSubmitReport}
      />

      {/* Architectural Verification Modal */}
      <ArchitectureModal
        isOpen={architectureModalOpen}
        onClose={() => setArchitectureModalOpen(false)}
        currentUser={auth.user}
        authToken={auth.token}
      />
    </div>
  );
}
