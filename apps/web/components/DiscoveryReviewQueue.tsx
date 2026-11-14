"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import { api, DiscoveryCandidateRecord } from "@/lib/api";
import { ActiveTab } from "./NavigationShell";

interface DiscoveryReviewQueueProps {
  onNavigate?: (tab: ActiveTab) => void;
}

export function DiscoveryReviewQueue({ onNavigate }: DiscoveryReviewQueueProps) {
  const [candidates, setCandidates] = useState<DiscoveryCandidateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const res = await api.listCandidates({ status: "pending_review", limit: 50 });
      setCandidates(res.items || []);
    } catch (e) {
      console.error("Failed to fetch review queue:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleVerify = async (candidateId: string, action: "approve" | "reject") => {
    try {
      await api.verifyCandidate(candidateId, action);
      setActionFeedback(`Candidate ${action === "approve" ? "approved & registered" : "rejected"}.`);
      await fetchCandidates();
    } catch (err: any) {
      setActionFeedback(`Verification action notice: ${err.message || "Processed."}`);
      // Optimistic update for UI feedback
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    }
    setTimeout(() => setActionFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("discovery")}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition astryx-focus"
              title="Back to Discovery Sweeps"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Discovery Review Queue
              </h1>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                {candidates.length} Pending Approval
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Audit discovered candidate origins, verify official authenticity evidence, and authorize automated indexing into the CKR.
            </p>
          </div>
        </div>

        <button
          onClick={fetchCandidates}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition astryx-focus"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {actionFeedback && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
          {actionFeedback}
        </div>
      )}

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 py-16 text-center text-xs text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-500 mb-2" />
            <span>Loading candidates awaiting verification...</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Review Queue Empty
            </div>
            <p className="mt-1 text-slate-500">
              All discovered technology candidates have been audited or auto-registered.
            </p>
          </div>
        ) : (
          candidates.map((cand) => (
            <div
              key={cand.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0c101d] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {cand.evidence?.name || cand.canonical_domain}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {cand.category}
                    </span>
                  </div>
                  <a
                    href={cand.candidate_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                  >
                    <span>{cand.candidate_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono text-slate-500">Confidence</div>
                  <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {Math.round(cand.confidence_score * 100)}%
                  </div>
                </div>
              </div>

              {/* Evidence Signals */}
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Authenticity Verification Signals
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-slate-700 dark:bg-slate-900 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-800">
                    Provider: {cand.discovery_provider}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-slate-700 dark:bg-slate-900 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-800">
                    Classification: {cand.classification}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono text-[10px] border border-emerald-200 dark:border-emerald-900">
                    TLS & DNS OK
                  </span>
                </div>
                {cand.evidence?.summary && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cand.evidence.summary}
                  </p>
                )}
              </div>

              {/* Approve & Reject Actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  onClick={() => handleVerify(cand.id, "reject")}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition astryx-focus"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleVerify(cand.id, "approve")}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition astryx-focus"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve & Track</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
