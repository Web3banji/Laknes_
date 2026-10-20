/**
 * LAKNES Administration & Verification View
 * Project reviews, community moderation queue, and immutable audit logs.
 */

import React, { useState, useEffect } from 'react';
import {
  Project,
  ReviewDecision,
  ContentReport,
  ContentReportStatus,
  AuditLog,
  User,
  UserRole,
} from '../../types/contracts.ts';
import { laknesClient } from '../../client/api-client.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

interface AdminViewProps {
  user: User | null;
  onNavigate: (view: string) => void;
  onSelectProject: (project: Project) => void;
}

export function AdminView({ user, onNavigate, onSelectProject }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'reviews' | 'moderation' | 'audit'>('reviews');
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review dialog state
  const [selectedReviewProject, setSelectedReviewProject] = useState<Project | null>(null);
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>(ReviewDecision.APPROVED);
  const [reviewNotes, setReviewNotes] = useState('Project documentation and contracts verified.');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const isAdmin = user?.roles.includes(UserRole.ADMIN);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pendingReviews, reps, logs] = await Promise.all([
        laknesClient.getPendingReviews().catch(() => []),
        laknesClient.getContentReports(ContentReportStatus.PENDING).catch(() => []),
        laknesClient.getAuditLogs().catch(() => []),
      ]);
      const projs: Project[] = (pendingReviews as any[])
        .map((r) => r.project || r)
        .filter((p) => Boolean(p && p.id && p.name));
      setPendingProjects(projs);
      setReports(reps);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Admin data load failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewProject) return;

    setIsSubmittingReview(true);
    setReviewMessage(null);
    try {
      await laknesClient.reviewProject(selectedReviewProject.id, reviewDecision, reviewNotes.trim());
      setReviewMessage(`Review recorded: ${selectedReviewProject.name} updated to ${reviewDecision}`);
      setSelectedReviewProject(null);
      await loadData();
    } catch (err: any) {
      setReviewMessage(`Review failed: ${err?.message}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleResolveReport = async (reportId: string, status: ContentReportStatus) => {
    try {
      await laknesClient.resolveReport(reportId, status);
      await loadData();
    } catch (err) {
      console.error('Resolve report error', err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="w-full max-w-2xl mx-auto px-margin-mobile py-24 text-center">
        <div className="p-10 rounded-2xl bg-surface-container-low border border-slate-800 flex flex-col items-center">
          <span className="material-symbols-outlined text-5xl text-rose-400 mb-3">gavel</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Admin Clearance Required</h2>
          <p className="text-xs text-on-surface-variant max-w-md mb-6 leading-relaxed">
            This module contains administrative verification controls, content moderation tools, and platform audit logs. Only users with the ADMIN role can execute reviews.
          </p>
          <button
            onClick={() => onNavigate('explore')}
            className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps uppercase font-semibold text-xs shadow-md"
          >
            Return to Explore
          </button>
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
            <span className="font-label-caps text-label-caps uppercase text-rose-300 tracking-wider text-[11px]">
              Platform Governance
            </span>
          </div>
          <h1 className="font-headline-xl text-3xl text-on-surface font-bold tracking-tight">
            Administration & Verification
          </h1>
          <p className="font-body-md text-on-surface-variant text-sm mt-1">
            Review ecosystem submissions, arbitrate moderation reports, and audit system events.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-xs font-label-caps uppercase hover:bg-surface-container-highest shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Queue
        </button>
      </div>

      {reviewMessage && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 ${
            reviewMessage.startsWith('Review failed')
              ? 'bg-rose-950/40 border border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{reviewMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'reviews' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">rule</span>
          Pending Reviews ({pendingProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'moderation' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">shield</span>
          Content Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-label-caps uppercase font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'border-primary-container text-primary' : 'border-transparent text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Pending Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading pending submissions...</div>
          ) : pendingProjects.length === 0 ? (
            <div className="p-16 rounded-2xl bg-surface-container-low border border-slate-800 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">task_alt</span>
              <h3 className="text-base font-semibold text-on-surface mb-1">All Submissions Processed</h3>
              <p className="text-xs text-on-surface-variant max-w-sm">
                No projects are currently awaiting review in the pipeline.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-5 rounded-2xl bg-surface-container-low border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-on-surface">{proj.name}</h3>
                      <span className="text-xs font-mono text-primary bg-primary-container/10 px-2 py-0.5 rounded">
                        /{proj.slug}
                      </span>
                      <StatusBadge status={proj.verificationStatus} />
                      <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary">
                        {proj.category}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant line-clamp-2">{proj.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-label-mono text-slate-400">
                      <span>Submitted: {new Date(proj.createdAt).toLocaleDateString()}</span>
                      {proj.websiteUrl && (
                        <a
                          href={proj.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary underline"
                        >
                          {proj.websiteUrl}
                        </a>
                      )}
                      {proj.contractAddresses && proj.contractAddresses.length > 0 && (
                        <span>{proj.contractAddresses.length} verified contracts</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectProject(proj)}
                      className="px-3.5 py-1.5 rounded-full bg-surface-container-high text-xs text-on-surface hover:bg-surface-container-highest"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReviewProject(proj);
                        setReviewDecision(ReviewDecision.APPROVED);
                        setReviewNotes('Project documentation, authenticity, and contracts verified.');
                      }}
                      className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold uppercase font-label-caps shadow-sm"
                    >
                      Audit / Decide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Action Modal */}
      {selectedReviewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-surface-container-low border border-slate-800 rounded-2xl shadow-2xl p-6 relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-on-surface">Review: {selectedReviewProject.name}</h3>
              <button
                onClick={() => setSelectedReviewProject(null)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleExecuteReview} className="space-y-4">
              <div>
                <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                  Review Decision *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ReviewDecision.APPROVED, label: 'Approve & Verify', color: 'emerald' },
                    { id: ReviewDecision.CHANGES_REQUESTED, label: 'Request Changes', color: 'amber' },
                    { id: ReviewDecision.REJECTED, label: 'Reject', color: 'rose' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setReviewDecision(d.id)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold text-center uppercase font-label-caps border transition-all ${
                        reviewDecision === d.id
                          ? 'bg-primary-container text-on-primary-container border-primary-container shadow-md'
                          : 'bg-surface-container text-slate-300 border-slate-800 hover:bg-surface-container-high'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-label-caps uppercase text-on-surface-variant mb-1">
                  Reviewer Notes & Feedback (visible to project submitter) *
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  required
                  placeholder="Explain reasoning, approval criteria met, or requested changes required..."
                  className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/40 rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReviewProject(null)}
                  className="px-4 py-2 rounded-full text-xs text-on-surface-variant hover:text-on-surface bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview || !reviewNotes.trim()}
                  className="px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-label-caps uppercase font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Commit Review Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Content Reports */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-16 rounded-2xl bg-surface-container-low border border-slate-800 text-center">
              <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">shield_with_heart</span>
              <h3 className="text-base font-semibold text-on-surface mb-1">No Active Reports</h3>
              <p className="text-xs text-on-surface-variant">Community moderation reports will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-xl bg-surface-container-low border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-900">
                        {rep.targetType}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Target ID: {rep.targetId}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1">"{rep.reason}"</p>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      Reported on {new Date(rep.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResolveReport(rep.id, ContentReportStatus.RESOLVED)}
                      className="px-3 py-1.5 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-xs font-semibold"
                    >
                      Resolve (Action Taken)
                    </button>
                    <button
                      onClick={() => handleResolveReport(rep.id, ContentReportStatus.DISMISSED)}
                      className="px-3 py-1.5 rounded-full bg-surface-container text-slate-400 hover:text-slate-200 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No audit logs recorded yet.</div>
          ) : (
            <div className="bg-surface-container-low rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-container border-b border-slate-800 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container/50">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 font-semibold text-primary whitespace-nowrap">{log.action}</td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        {log.targetType}:{log.targetId.slice(0, 8)}...
                      </td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">{log.actorId.slice(0, 8)}...</td>
                      <td className="p-3 text-slate-400 font-sans text-[11px] truncate max-w-xs">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
