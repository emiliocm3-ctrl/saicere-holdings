"use client";

import { useEffect, useState, useCallback } from "react";
import {
  generateDailyBriefing,
  fetchLatestBriefing,
  processBrainDumpAction,
} from "./actions";
import type { Briefing, BrainDumpAction } from "@/lib/types";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function actionLabel(action: BrainDumpAction): string {
  switch (action.type) {
    case "create_task":
      return `Created task "${action.task_title}"`;
    case "update_status":
      return `Updated "${action.task_title ?? action.task_id}" → ${action.new_status}`;
    case "flag_blocker":
      return `Flagged blocker: ${action.blocker_description ?? action.description}`;
    case "log_activity":
      return `Logged: ${action.description}`;
    case "assign":
      return `Assigned "${action.task_title ?? action.task_id}" to ${action.assignee}`;
    default:
      return "Action processed";
  }
}

export default function DashboardPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [dumpInput, setDumpInput] = useState("");
  const [dumpProcessing, setDumpProcessing] = useState(false);
  const [toast, setToast] = useState<{
    actions: BrainDumpAction[];
    visible: boolean;
  } | null>(null);

  const loadBriefing = useCallback(async () => {
    const result = await fetchLatestBriefing();
    if (result.data) setBriefing(result.data);
    setInitialLoad(false);
  }, []);

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  async function handleGenerate() {
    setLoading(true);
    const result = await generateDailyBriefing();
    if (result.data) setBriefing(result.data);
    setLoading(false);
  }

  async function handleBrainDump() {
    const text = dumpInput.trim();
    if (!text) return;

    setDumpProcessing(true);
    const result = await processBrainDumpAction(text);
    setDumpProcessing(false);
    setDumpInput("");

    if (result.actions.length > 0) {
      setToast({ actions: result.actions, visible: true });
      setTimeout(() => setToast(null), 6000);
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 pb-28 pt-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              Daily Briefing
            </h1>
            <p className="mt-1 text-sm text-text-muted">{formatDate(new Date())}</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate Briefing"}
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-bg-elevated"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !briefing && !initialLoad && (
          <div className="rounded-xl border border-border bg-bg-elevated px-6 py-16 text-center">
            <p className="text-text-muted">
              No briefing yet. Generate one to see your daily overview.
            </p>
          </div>
        )}

        {/* Briefing content */}
        {!loading && briefing && (
          <div className="space-y-5">
            {/* Summary */}
            <section className="rounded-xl border border-border bg-bg-elevated p-5">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-text-muted">
                Summary
              </h2>
              <p className="leading-relaxed text-text">{briefing.summary}</p>
            </section>

            {/* Accomplishments */}
            {briefing.accomplishments.length > 0 && (
              <section className="rounded-xl border border-border bg-bg-elevated p-5">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-text-muted">
                  Accomplishments
                </h2>
                <ul className="space-y-2">
                  {briefing.accomplishments.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Blockers */}
            {briefing.blockers.length > 0 && (
              <section className="rounded-xl border border-border bg-bg-elevated p-5">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-text-muted">
                  Blockers
                </h2>
                <ul className="space-y-2">
                  {briefing.blockers.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Next Steps */}
            {briefing.next_steps.length > 0 && (
              <section className="rounded-xl border border-border bg-bg-elevated p-5">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-text-muted">
                  Next Steps
                </h2>
                <ul className="space-y-2">
                  {briefing.next_steps.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Brain Dump floating bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg/80 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBrainDump();
          }}
          className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-8"
        >
          <input
            type="text"
            value={dumpInput}
            onChange={(e) => setDumpInput(e.target.value)}
            placeholder="Brain dump — what's on your mind?"
            disabled={dumpProcessing}
            className="flex-1 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text placeholder:text-text-dim outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            disabled={dumpProcessing || !dumpInput.trim()}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {dumpProcessing ? (
              <span className="inline-flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Processing
              </span>
            ) : (
              "Send"
            )}
          </button>
        </form>
      </div>

      {/* Toast notification */}
      {toast?.visible && (
        <div className="fixed bottom-20 right-6 z-50 w-80 animate-in fade-in slide-in-from-bottom-4 rounded-xl border border-border bg-bg-elevated p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              Brain Dump Processed
            </p>
            <button
              onClick={() => setToast(null)}
              className="text-text-dim hover:text-text"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ul className="space-y-1">
            {toast.actions.map((action, i) => (
              <li key={i} className="text-sm text-text-muted">
                • {actionLabel(action)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
