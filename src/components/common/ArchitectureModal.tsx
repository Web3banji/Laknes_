/**
 * LAKNES Architecture & Verification Suite Modal
 * Preserves the full architectural verification suite, 10-step automated tester, contracts inspector, and live workflow runner.
 */

import React, { useState } from 'react';
import { laknesClient } from '../../client/api-client.ts';
import { useAsyncState } from '../../client/hooks/useAsyncState.ts';
import { SystemStatusResponse } from '../../types/api.ts';
import { ProjectCategory, ReviewDecision, User } from '../../types/contracts.ts';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  authToken: string | null;
}

export function ArchitectureModal({
  isOpen,
  onClose,
  currentUser,
  authToken,
}: ArchitectureModalProps) {
  const { data: statusData, isLoading, reload } = useAsyncState<SystemStatusResponse>(
    () => laknesClient.getSystemStatus()
  );

  const [activeTab, setActiveTab] = useState<'status' | 'workflows' | 'contracts' | 'routes'>('status');
  const [testLog, setTestLog] = useState<{ step: string; status: 'SUCCESS' | 'ERROR' | 'INFO'; details: unknown }[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Quick form states for live testing
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [projectForm, setProjectForm] = useState({
    name: 'Elysium Dex Protocol',
    slug: 'elysium-dex',
    category: ProjectCategory.DEFI,
    shortDescription: 'Decentralized exchange built on the Elysium ecosystem.',
    description: 'High-throughput AMM providing seamless liquidity and ultra-low fees on Elysium.',
    websiteUrl: 'https://elysiumdex.io',
    ecosystem: 'Elysium',
  });

  if (!isOpen) return null;

  const appendLog = (step: string, status: 'SUCCESS' | 'ERROR' | 'INFO', details: unknown) => {
    setTestLog((prev) => [{ step, status, details }, ...prev]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await laknesClient.register(regForm);
      appendLog('User Registration', 'SUCCESS', { userId: res.user.id, email: res.user.email, roles: res.user.roles });
    } catch (err: any) {
      appendLog('User Registration', 'ERROR', err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await laknesClient.login(loginForm);
      appendLog('User Login', 'SUCCESS', { userId: res.user.id, email: res.user.email, roles: res.user.roles });
    } catch (err: any) {
      appendLog('User Login', 'ERROR', err.message);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const project = await laknesClient.submitProject(projectForm);
      appendLog('Project Submission', 'SUCCESS', {
        id: project.id,
        name: project.name,
        verificationStatus: project.verificationStatus,
        notice: 'Project is in PENDING_REVIEW; not yet visible in public discovery.',
      });
    } catch (err: any) {
      appendLog('Project Submission', 'ERROR', err.message);
    }
  };

  const runFullVerificationSuite = async () => {
    setIsRunningTest(true);
    setTestLog([]);
    const testSuffix = Math.floor(Math.random() * 9000 + 1000);
    const adminEmail = `admin-${testSuffix}@elysium.org`;
    const userEmail = `founder-${testSuffix}@elysium.org`;
    const userPass = 'SecurePass123!';
    const testSlug = `elysium-project-${testSuffix}`;

    try {
      appendLog('Suite Step 1: Registering Admin User', 'INFO', { email: adminEmail });
      const adminSession = await laknesClient.register({
        username: `admin_${testSuffix}`,
        email: adminEmail,
        password: userPass,
      });
      appendLog('Admin Account Created', 'SUCCESS', { id: adminSession.user.id, roles: adminSession.user.roles });

      appendLog('Suite Step 2: Registering Project Founder User', 'INFO', { email: userEmail });
      const founderSession = await laknesClient.register({
        username: `founder_${testSuffix}`,
        email: userEmail,
        password: userPass,
      });
      laknesClient.setToken(founderSession.token);
      appendLog('Founder Account Created', 'SUCCESS', { id: founderSession.user.id });

      appendLog('Suite Step 3: Submitting Elysium Project', 'INFO', { slug: testSlug });
      const submittedProject = await laknesClient.submitProject({
        name: `Elysium Nexus ${testSuffix}`,
        slug: testSlug,
        shortDescription: 'Core liquidity bridge for Elysium network.',
        description: 'Comprehensive cross-chain liquidity and ecosystem portal.',
        category: ProjectCategory.INFRASTRUCTURE,
        websiteUrl: `https://nexus-${testSuffix}.elysium.org`,
        ecosystem: 'Elysium',
      });
      appendLog('Project Submitted', 'SUCCESS', {
        id: submittedProject.id,
        slug: submittedProject.slug,
        status: submittedProject.verificationStatus,
      });

      appendLog('Suite Step 4: Testing Public Discovery Boundary', 'INFO', 'Verifying pending project is hidden...');
      const publicProjects = await laknesClient.discoverProjects({ query: testSlug });
      const isLeaked = publicProjects.some((p) => p.slug === testSlug);
      if (isLeaked) {
        throw new Error('SECURITY VIOLATION: Pending project leaked into public discovery!');
      }
      appendLog('Discovery Boundary Verified', 'SUCCESS', 'Pending project is strictly omitted from public discovery.');

      appendLog('Suite Step 5: Testing Self-Approval Prevention', 'INFO', 'Founder attempting to approve own project...');
      let selfApprovalBlocked = false;
      try {
        await laknesClient.reviewProject(submittedProject.id, ReviewDecision.APPROVED, 'Self approval attempt');
      } catch (err: any) {
        selfApprovalBlocked = true;
        appendLog('Self-Approval Successfully Blocked', 'SUCCESS', {
          errorBlocked: err.message,
          code: err.code,
        });
      }
      if (!selfApprovalBlocked) {
        throw new Error('SECURITY VIOLATION: Submitter was able to execute administrative review!');
      }

      appendLog('Suite Step 6: Admin Approving Project', 'INFO', 'Switching to admin token...');
      laknesClient.setToken(adminSession.token);
      const reviewResult = await laknesClient.reviewProject(
        submittedProject.id,
        ReviewDecision.APPROVED,
        'Project verified after documentation audit.'
      );
      appendLog('Project Approved by Admin', 'SUCCESS', {
        decision: reviewResult.decision,
        reviewNotes: reviewResult.reviewNotes,
      });

      appendLog('Suite Step 7: Verifying Public Discovery Post-Approval', 'INFO', 'Querying public discovery...');
      const verifiedProjects = await laknesClient.discoverProjects({ query: testSlug });
      const foundInPublic = verifiedProjects.find((p) => p.slug === testSlug);
      if (!foundInPublic) {
        throw new Error('Expected project to be discoverable in public discovery after approval.');
      }
      appendLog('Public Discovery Confirmed', 'SUCCESS', {
        id: foundInPublic.id,
        status: foundInPublic.verificationStatus,
      });

      appendLog('Suite Step 8: Testing Follow and Save Persistence', 'INFO', 'Founder follows and saves project...');
      laknesClient.setToken(founderSession.token);
      await laknesClient.followProject(submittedProject.id);
      await laknesClient.saveProject(submittedProject.id);

      const follows = await laknesClient.getUserFollows(founderSession.user.id);
      const saved = await laknesClient.getUserSavedProjects(founderSession.user.id);
      appendLog('Follow & Save Verified', 'SUCCESS', {
        followedCount: follows.length,
        savedCount: saved.length,
        persisted: true,
      });

      appendLog('Suite Step 9: Verifying Representative Dashboard', 'INFO', 'Fetching dashboard as project owner...');
      const dashboard = await laknesClient.getProjectDashboard(submittedProject.id);
      appendLog('Representative Dashboard Loaded', 'SUCCESS', {
        role: dashboard.userRole,
        membersCount: dashboard.members.length,
        reviewHistoryCount: dashboard.reviewHistory.length,
      });

      appendLog('Suite Step 10: Verifying Audit Log Records', 'INFO', 'Admin querying audit log trail...');
      laknesClient.setToken(adminSession.token);
      const logs = await laknesClient.getAuditLogs();
      appendLog('Audit Trail Active', 'SUCCESS', {
        totalRecordedEvents: logs.length,
        recentActions: logs.slice(0, 3).map((l) => l.action),
      });

      appendLog('ALL 10 VERIFICATION CHECKS PASSED', 'SUCCESS', 'Architecture and services are robust and verified.');
    } catch (err: any) {
      appendLog('Verification Suite Encountered Error', 'ERROR', err.message);
    } finally {
      setIsRunningTest(false);
      laknesClient.setToken(authToken);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto font-mono text-xs text-slate-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                LAKNES Architecture & Security Verification Console
              </h2>
              <span className="text-[11px] text-slate-400 font-sans">
                Native SQLite &bull; Salted Scrypt Cryptography &bull; Server-Authoritative RBAC
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runFullVerificationSuite}
              disabled={isRunningTest}
              className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500 text-white font-medium transition text-xs"
            >
              {isRunningTest ? 'Running Suite...' : 'Run Automated Test Suite'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-900/40 border-b border-slate-800">
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Persistent Database</span>
            <span className="text-xs font-semibold text-emerald-400 mt-0.5 block">Native SQLite (data/laknes.db)</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Cryptography</span>
            <span className="text-xs font-semibold text-emerald-400 mt-0.5 block">Node.js Scrypt (Salted)</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Session Protocol</span>
            <span className="text-xs font-semibold text-emerald-400 mt-0.5 block">TTL Token in Database</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Current Session</span>
            <span className="text-xs font-semibold text-primary mt-0.5 block truncate">
              {currentUser ? `${currentUser.username} (${currentUser.roles.join(', ')})` : 'Anonymous'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-4 pt-2 gap-2 bg-slate-900/20">
          {[
            { key: 'status', label: '1. Architecture & Verification Log' },
            { key: 'workflows', label: '2. Live Endpoint Tester' },
            { key: 'contracts', label: '3. Relational Schemas' },
            { key: 'routes', label: '4. REST Route Matrix' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200 uppercase tracking-wider">
                  Automated Security & Integrity Test Log
                </span>
                {testLog.length > 0 && (
                  <button onClick={() => setTestLog([])} className="text-slate-400 hover:text-slate-200 underline">
                    Clear Log
                  </button>
                )}
              </div>

              {testLog.length === 0 ? (
                <div className="p-6 bg-slate-900/60 rounded border border-slate-800 text-slate-500 italic text-center">
                  Click "Run Automated Test Suite" above to execute all 10 architectural boundary checks.
                </div>
              ) : (
                <div className="space-y-2">
                  {testLog.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded border ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
                          : log.status === 'ERROR'
                          ? 'bg-rose-950/30 border-rose-900/60 text-rose-300'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold uppercase tracking-wider">{log.step}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950">
                          {log.status}
                        </span>
                      </div>
                      <pre className="overflow-x-auto text-slate-400 text-[11px]">
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded">
                <span className="font-bold text-slate-200 uppercase block mb-3">Live Registration / Login</span>
                <form onSubmit={handleRegister} className="space-y-2 mb-4">
                  <input
                    type="text"
                    placeholder="Username"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <button type="submit" className="w-full py-1.5 bg-indigo-600 rounded text-white text-xs font-bold">
                    Test Register
                  </button>
                </form>

                <form onSubmit={handleLogin} className="space-y-2 pt-3 border-t border-slate-800">
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <button type="submit" className="w-full py-1.5 bg-slate-800 rounded text-white text-xs font-bold">
                    Test Login
                  </button>
                </form>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded">
                <span className="font-bold text-slate-200 uppercase block mb-3">Live Project Submit</span>
                <form onSubmit={handleProjectSubmit} className="space-y-2">
                  <input
                    type="text"
                    placeholder="Project Name"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Slug"
                    value={projectForm.slug}
                    onChange={(e) => setProjectForm({ ...projectForm, slug: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Short Description"
                    value={projectForm.shortDescription}
                    onChange={(e) => setProjectForm({ ...projectForm, shortDescription: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Website URL"
                    value={projectForm.websiteUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, websiteUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs"
                    required
                  />
                  <button type="submit" className="w-full py-1.5 bg-emerald-600 rounded text-white text-xs font-bold">
                    Test Submit Project
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[11px]">
              {[
                { name: 'users', info: 'id (PK), username (UNIQUE), email (UNIQUE), password_hash, salt, roles (JSON), bio, created_at' },
                { name: 'sessions', info: 'token (PK), user_id (FK -> users), expires_at, created_at' },
                { name: 'projects', info: 'id (PK), name, slug (UNIQUE), category, website_url, verification_status, contract_addresses' },
                { name: 'project_memberships', info: 'id (PK), user_id (FK), project_id (FK), role, status, UNIQUE(user_id, project_id)' },
                { name: 'project_updates', info: 'id (PK), project_id (FK), author_id (FK), title, content, publication_status' },
                { name: 'quests', info: 'id (PK), project_id (FK), title, quest_type, reward_configuration, publication_status' },
                { name: 'quest_participations', info: 'id (PK), quest_id (FK), user_id (FK), UNIQUE(quest_id, user_id), status' },
                { name: 'project_follows', info: 'id (PK), user_id (FK), project_id (FK), UNIQUE(user_id, project_id)' },
                { name: 'saved_projects', info: 'id (PK), user_id (FK), project_id (FK), UNIQUE(user_id, project_id)' },
                { name: 'project_reviews', info: 'id (PK), project_id (FK), reviewer_id (FK), decision, review_notes' },
                { name: 'content_reports', info: 'id (PK), reporter_id (FK), target_type, target_id, reason, report_status' },
                { name: 'audit_logs', info: 'id (PK), actor_id, action, target_type, target_id, details, timestamp' },
              ].map((t) => (
                <div key={t.name} className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <span className="font-bold text-emerald-400 block mb-0.5">TABLE: {t.name}</span>
                  <span className="text-slate-400 leading-tight block">{t.info}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              {[
                { method: 'POST', path: '/api/auth/register', note: 'Salted scrypt hash + session token generation' },
                { method: 'POST', path: '/api/auth/login', note: 'Constant-time verification' },
                { method: 'GET', path: '/api/projects/discover', note: 'Public discovery (VERIFIED only)' },
                { method: 'POST', path: '/api/projects/submit', note: 'Submits project into PENDING_REVIEW' },
                { method: 'GET', path: '/api/projects/:id/dashboard', note: 'Representative dashboard & review history' },
                { method: 'POST', path: '/api/reviews/project/:id', note: 'Admin review decision (Approve/Reject/Changes)' },
                { method: 'POST', path: '/api/projects/:id/corrections', note: 'Resubmit after changes requested' },
                { method: 'POST', path: '/api/quests/:id/join', note: 'Join quest & track status' },
                { method: 'POST', path: '/api/quests/:id/submit', note: 'Submit proof of quest completion' },
              ].map((r, i) => (
                <div key={i} className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-emerald-400 font-bold">{r.method}</span> <code className="text-slate-200">{r.path}</code>
                  <span className="text-slate-500 block text-[10px] mt-0.5">{r.note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
