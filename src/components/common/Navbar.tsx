/**
 * LAKNES Navigation Bar
 * Role-aware workspace navigation system:
 * - USER WORKSPACE: Explore, Projects, Quests, Following, My Dashboard
 * - PROJECT WORKSPACE: Overview, My Project, Quests, Audience, Creator Studio, Settings
 * - Seamless Workspace Switcher without re-authentication.
 */

import React, { useState } from 'react';
import { User, Project, UserRole, ProjectVerificationStatus } from '../../types/contracts.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: User | null;
  workspace: 'user' | 'project';
  activeProject: Project | null;
  userProjects: Array<Project & { myMembershipRole?: string }>;
  onSwitchWorkspace: (targetWorkspace: 'user' | 'project', targetProjectId?: string) => void;
  onOpenAuth: (initialMode?: 'login' | 'register', accountType?: 'user' | 'project') => void;
  onLogout: () => void;
  onOpenArchitecture?: () => void;
}

export function Navbar({
  currentView,
  onNavigate,
  user,
  workspace,
  activeProject,
  userProjects,
  onSwitchWorkspace,
  onOpenAuth,
  onLogout,
  onOpenArchitecture,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);

  const isAdmin = user?.roles.includes(UserRole.ADMIN);

  // Navigation Items depending on active workspace
  const userNavItems = [
    { id: 'explore', label: 'Explore' },
    { id: 'projects', label: 'Projects' },
    { id: 'quests', label: 'Quests' },
    { id: 'following', label: 'Following' },
    { id: 'user-dashboard', label: 'My Dashboard' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Review' }] : []),
  ];

  const projectNavItems = [
    { id: 'project-overview', label: 'Overview' },
    { id: 'project-profile', label: 'My Project' },
    { id: 'project-quests', label: 'Quests' },
    { id: 'project-audience', label: 'Audience' },
    { id: 'project-creator-studio', label: 'Creator Studio' },
    { id: 'project-settings', label: 'Settings' },
  ];

  const activeNavItems = workspace === 'project' ? projectNavItems : userNavItems;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.35)] border-b border-slate-800/80">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark & Workspace Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              if (workspace === 'project') {
                onNavigate('project-overview');
              } else {
                onNavigate('explore');
              }
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 group focus:outline-none cursor-pointer"
          >
            <BrandLogo size={34} showText={true} />
          </button>

          {/* Active Workspace Tag */}
          {user && (
            <div className="hidden sm:flex items-center">
              <span className="text-slate-600 mx-1.5">&bull;</span>
              {workspace === 'project' && activeProject ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container/15 border border-primary-container/30 text-primary text-[11px] font-label-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                  <span className="font-bold truncate max-w-[120px]">{activeProject.name}</span>
                  {activeProject.verificationStatus === ProjectVerificationStatus.VERIFIED && (
                    <span className="material-symbols-outlined text-[13px] text-emerald-400">verified</span>
                  )}
                </div>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-slate-300 text-[11px] font-label-mono border border-slate-800">
                  User Workspace
                </span>
              )}
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-6">
          {activeNavItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`font-body-md text-sm transition-colors whitespace-nowrap shrink-0 relative py-1 ${
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container rounded-full"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Workspace Switcher & Auth Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Architecture Suite (Diagnostic Tool) */}
          {onOpenArchitecture && (
            <button
              onClick={onOpenArchitecture}
              className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500/60 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Architectural Verification & Test Suite"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Test Suite</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              {/* Workspace Switcher */}
              <div className="relative">
                {workspace === 'project' ? (
                  <button
                    onClick={() => onSwitchWorkspace('user')}
                    className="px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-slate-700 text-xs font-label-caps uppercase text-on-surface flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Switch to User Workspace"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                    <span>User Workspace</span>
                  </button>
                ) : userProjects.length > 0 ? (
                  <div className="relative">
                    <button
                      onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                      className="px-3.5 py-1.5 rounded-full bg-primary-container/15 hover:bg-primary-container/25 border border-primary-container/40 text-primary text-xs font-label-caps uppercase font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">token</span>
                      <span>Project Workspace</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                    </button>

                    {workspaceDropdownOpen && (
                      <div
                        onMouseLeave={() => setWorkspaceDropdownOpen(false)}
                        className="absolute right-0 mt-2 w-64 bg-surface-container-low border border-slate-800 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-xs"
                      >
                        <div className="px-3 py-1.5 text-[10px] font-label-caps uppercase text-slate-400 border-b border-slate-800">
                          Switch Workspace
                        </div>

                        <button
                          onClick={() => {
                            setWorkspaceDropdownOpen(false);
                            onSwitchWorkspace('user');
                          }}
                          className="w-full p-2 rounded-lg text-left hover:bg-surface-container flex items-center justify-between text-slate-300 font-medium"
                        >
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                            <span>User Workspace</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Active</span>
                        </button>

                        <div className="px-3 py-1 text-[10px] font-label-caps uppercase text-slate-400 border-t border-slate-800/80 mt-1">
                          Your Managed Projects
                        </div>

                        {userProjects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setWorkspaceDropdownOpen(false);
                              onSwitchWorkspace('project', p.id);
                            }}
                            className="w-full p-2 rounded-lg text-left hover:bg-surface-container flex items-center justify-between text-on-surface"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="material-symbols-outlined text-[15px] text-primary">token</span>
                              <span className="font-bold truncate">{p.name}</span>
                            </span>
                            <span className="text-[10px] text-primary font-mono shrink-0 uppercase">
                              {p.myMembershipRole || 'Member'}
                            </span>
                          </button>
                        ))}

                        {user?.roles?.includes(UserRole.PROJECT_REPRESENTATIVE) && (
                          <button
                            onClick={() => {
                              setWorkspaceDropdownOpen(false);
                              onNavigate('submit-project');
                            }}
                            className="w-full p-2 rounded-lg text-left hover:bg-surface-container flex items-center gap-2 text-primary border-t border-slate-800/80 mt-1 font-label-caps uppercase text-[11px]"
                          >
                            <span className="material-symbols-outlined text-[15px]">add</span>
                            <span>+ Register New Project</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Profile Link */}
              <button
                onClick={() => onNavigate('user-dashboard')}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/30 cursor-pointer"
                title="Open My Dashboard"
              >
                <img
                  src={user.profileImage || '/src/assets/images/elysium_avatar_default_1792495691476.jpg'}
                  alt={user.username}
                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                />
                <span className="text-xs text-on-surface font-medium max-w-[100px] truncate">
                  {user.username}
                </span>
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenAuth('login', 'user')}
                className="font-label-mono text-label-mono text-xs text-on-surface-variant hover:text-on-surface px-3 py-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register', 'user')}
                className="font-label-caps text-label-caps uppercase bg-primary-container text-on-primary-container px-4 py-2 rounded-full shadow-[0_0_20px_rgba(0,210,255,0.35)] hover:bg-primary-fixed-dim hover:text-on-primary-fixed transition-all duration-200 active:scale-95 whitespace-nowrap text-xs font-semibold cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[24px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800 bg-surface-container-lowest px-margin-mobile py-4 flex flex-col gap-3">
          {/* Workspace Switcher in Mobile */}
          {user && (
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-label-mono">Active Workspace:</span>
              {workspace === 'project' ? (
                <button
                  onClick={() => {
                    onSwitchWorkspace('user');
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1 rounded-full bg-surface-container text-xs font-semibold text-primary"
                >
                  Switch to User Workspace
                </button>
              ) : userProjects.length > 0 ? (
                <button
                  onClick={() => {
                    onSwitchWorkspace('project', userProjects[0].id);
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold"
                >
                  Switch to Project ({userProjects[0].name})
                </button>
              ) : (
                <button
                  onClick={() => {
                    onNavigate('submit-project');
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1 rounded-full bg-surface-container text-xs text-primary"
                >
                  + Submit Project
                </button>
              )}
            </div>
          )}

          {/* Navigation Items */}
          {activeNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`text-left py-2 text-sm font-medium ${
                currentView === item.id ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Mobile Auth actions */}
          {user ? (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  onNavigate('user-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-on-surface font-medium flex items-center gap-2"
              >
                <span>{user.username}</span>
                <span className="text-[10px] text-slate-500 font-mono">({user.email})</span>
              </button>
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-rose-400 font-semibold"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => {
                  onOpenAuth('login');
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 rounded-lg bg-surface-container text-xs text-center font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  onOpenAuth('register');
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 rounded-lg bg-primary-container text-on-primary-container text-xs text-center font-semibold"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
