"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type {
  ActivityLog,
  AttentionTask,
  DashboardSnapshot,
  ProjectWithAggregate,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";
import { StatusCard, StatusDot } from "./status-card";
import {
  advanceTaskStatus,
  generateTodayBriefing,
  nextTaskStatus,
} from "../actions";

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-center">
      <div className="text-lg font-semibold leading-tight text-text">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-dim">
        {label}
      </div>
    </div>
  );
}

function AttentionRow({
  task,
  onAdvance,
  pending,
}: {
  task: AttentionTask;
  onAdvance: () => void;
  pending: boolean;
}) {
  return (
    <StatusCard
      status={task.status}
      progress={0.3}
      priority={task.priority}
      variant="row"
      onClick={onAdvance}
      ariaLabel={`Advance ${task.title} from ${task.status}`}
      className={pending ? "opacity-60" : ""}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-text">
            {task.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-text-muted">
            {task.project_name} · {TASK_STATUS_LABEL[task.status]}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            task.priority === "urgent"
              ? "bg-red-100 text-red-700"
              : task.priority === "high"
              ? "bg-orange-100 text-orange-700"
              : "bg-white/60 text-text-muted"
          }`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>
    </StatusCard>
  );
}

function ProjectOverviewCard({ project }: { project: ProjectWithAggregate }) {
  const progress =
    project.totalTasks === 0 ? 0 : project.doneTasks / project.totalTasks;

  return (
    <Link href={`/dashboard/projects/${project.id}`} className="block">
      <StatusCard
        status={project.status}
        progress={progress}
        blocked={project.hasBlocker}
        priority={project.hasUrgent ? "urgent" : null}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-text">
              {project.name}
            </h3>
            {project.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-text-muted">
                {project.description}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-text-muted capitalize">
            {project.status}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(Object.keys(project.taskCounts) as TaskStatus[])
              .filter((s) => project.taskCounts[s] > 0)
              .map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <StatusDot status={s} />
                  <span className="text-[10px] text-text-muted">
                    {project.taskCounts[s]}
                  </span>
                </div>
              ))}
            {project.totalTasks === 0 && (
              <span className="text-[11px] text-text-dim">No tasks yet</span>
            )}
          </div>
          {project.totalTasks > 0 && (
            <span className="text-[11px] font-medium text-text-muted">
              {project.doneTasks}/{project.totalTasks}
            </span>
          )}
        </div>
      </StatusCard>
    </Link>
  );
}

function ActivityItem({ entry }: { entry: ActivityLog }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-text">{entry.content}</p>
        <p className="text-[10px] text-text-dim">
          {entry.event_type} · {formatRelative(entry.created_at)}
        </p>
      </div>
    </div>
  );
}

function BriefingCard({
  snapshot,
  onGenerate,
  generating,
}: {
  snapshot: DashboardSnapshot;
  onGenerate: () => void;
  generating: boolean;
}) {
  if (snapshot.todaysBriefing) {
    const b = snapshot.todaysBriefing;
    return (
      <div className="rounded-2xl border border-accent/20 bg-accent-dim px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-accent">
            Today&apos;s briefing
          </span>
          <Link
            href="/dashboard/chat?q=Walk%20me%20through%20today%27s%20briefing"
            className="text-[10px] font-medium text-accent hover:underline"
          >
            Discuss →
          </Link>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text">{b.summary}</p>
        {b.next_steps.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {b.next_steps.slice(0, 3).map((step, i) => (
              <li key={i} className="text-[11px] text-text-muted">
                → {step}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onGenerate}
      disabled={generating}
      className="flex w-full items-center justify-between rounded-2xl border border-dashed border-accent/30 bg-bg-elevated px-4 py-3 text-left transition-colors hover:border-accent/60 disabled:opacity-60"
    >
      <div>
        <p className="text-[13px] font-medium text-text">
          {generating ? "Generating briefing..." : "Generate today's briefing"}
        </p>
        <p className="mt-0.5 text-[11px] text-text-muted">
          Synthesize projects, tasks, and activity into one read.
        </p>
      </div>
      <span className="text-accent">→</span>
    </button>
  );
}

export function DashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const router = useRouter();
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [generating, startGenerate] = useTransition();

  const today = useMemo(() => new Date(), []);
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function handleAdvance(task: AttentionTask) {
    if (pendingTaskIds.has(task.id)) return;
    setPendingTaskIds((prev) => new Set(prev).add(task.id));

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }

    const target = nextTaskStatus(task.status);
    const res = await advanceTaskStatus(task.id, target, {
      projectId: task.project_id,
      taskTitle: task.title,
      fromStatus: task.status,
    });

    setPendingTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });

    if (!res.error) router.refresh();
  }

  function handleGenerateBriefing() {
    startGenerate(async () => {
      await generateTodayBriefing();
      router.refresh();
    });
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5 py-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text">
              {greeting(today)}
            </h1>
            <p className="mt-0.5 text-[12px] text-text-muted">{dateLabel}</p>
          </div>
          <Link
            href="/dashboard/chat?q=Give%20me%20a%20briefing"
            className="rounded-full border border-accent/30 bg-accent-dim px-3 py-1.5 text-[11px] font-medium text-accent hover:bg-accent/10"
          >
            Ask Saicere
          </Link>
        </div>

        {/* Briefing */}
        <BriefingCard
          snapshot={snapshot}
          onGenerate={handleGenerateBriefing}
          generating={generating}
        />

        {/* Stats strip */}
        <div className="flex gap-2">
          <StatPill label="Active" value={snapshot.stats.activeProjects} />
          <StatPill label="In progress" value={snapshot.stats.inProgressTasks} />
          <StatPill label="Blockers 7d" value={snapshot.stats.blockersThisWeek} />
          <StatPill label="Done 7d" value={snapshot.stats.doneThisWeek} />
        </div>

        {/* Needs attention */}
        {snapshot.attention.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                Needs attention
              </h2>
              <span className="text-[10px] text-text-dim">
                tap to advance status
              </span>
            </div>
            <div className="space-y-2">
              {snapshot.attention.map((task) => (
                <AttentionRow
                  key={task.id}
                  task={task}
                  onAdvance={() => handleAdvance(task)}
                  pending={pendingTaskIds.has(task.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
              Projects
            </h2>
            <Link
              href="/dashboard/projects"
              className="text-[11px] font-medium text-accent hover:underline"
            >
              View all →
            </Link>
          </div>

          {snapshot.projects.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-elevated px-6 py-10 text-center">
              <p className="text-[13px] text-text-muted">
                No projects yet. Use chat to create one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {snapshot.projects.map((p) => (
                <ProjectOverviewCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        {snapshot.recentActivity.length > 0 && (
          <section>
            <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
              Recent activity
            </h2>
            <div className="rounded-xl border border-border bg-bg-elevated px-3 py-1.5">
              {snapshot.recentActivity.map((a) => (
                <ActivityItem key={a.id} entry={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
