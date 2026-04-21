"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addProject, loadProjects, removeProject } from "./actions";
import {
  cycleProjectStatus,
  updateProjectFields,
} from "../actions";
import { ActionSheet, type ActionSheetGroup } from "../components/action-sheet";
import { StatusCard, StatusDot } from "../components/status-card";
import type {
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
} from "@/lib/types";

type ProjectWithTasks = Project & { tasks: Task[] };

type Filter = "all" | ProjectStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
];

const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: "var(--grad-active-from)",
  paused: "var(--grad-paused-from)",
  completed: "var(--grad-completed-from)",
  archived: "var(--grad-archived-from)",
};

const EMPTY_TASK_COUNTS: Record<TaskStatus, number> = {
  backlog: 0,
  todo: 0,
  in_progress: 0,
  review: 0,
  done: 0,
};

function aggregate(tasks: Task[]): {
  counts: Record<TaskStatus, number>;
  total: number;
  done: number;
  hasUrgent: boolean;
} {
  const counts = { ...EMPTY_TASK_COUNTS };
  let hasUrgent = false;
  for (const t of tasks) {
    counts[t.status] += 1;
    if (t.priority === "urgent" && t.status !== "done") hasUrgent = true;
  }
  return { counts, total: tasks.length, done: counts.done, hasUrgent };
}

/** Detects a long-press without swallowing the tap for navigation. */
function useLongPress(onLongPress: () => void, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggered = useRef(false);

  const start = useCallback(() => {
    triggered.current = false;
    timer.current = setTimeout(() => {
      triggered.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(12);
      }
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    wasTriggered: () => triggered.current,
  };
}

function ProjectTile({
  project,
  onLongPress,
}: {
  project: ProjectWithTasks;
  onLongPress: () => void;
}) {
  const agg = aggregate(project.tasks);
  const progress = agg.total === 0 ? 0 : agg.done / agg.total;
  const router = useRouter();
  const lp = useLongPress(onLongPress);

  return (
    <StatusCard
      status={project.status}
      progress={progress}
      priority={agg.hasUrgent ? "urgent" : null}
      onClick={() => {
        if (lp.wasTriggered()) return;
        router.push(`/dashboard/projects/${project.id}`);
      }}
      onPointerDown={lp.onPointerDown}
      onPointerUp={lp.onPointerUp}
      onPointerLeave={lp.onPointerLeave}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      ariaLabel={`${project.name} — ${project.status}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
          {project.name}
        </h3>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-text-muted capitalize">
          {project.status}
        </span>
      </div>
      {project.description && (
        <p className="mt-1 line-clamp-2 text-[11px] text-text-muted">
          {project.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(Object.keys(agg.counts) as TaskStatus[])
            .filter((s) => agg.counts[s] > 0)
            .map((s) => (
              <div key={s} className="flex items-center gap-1">
                <StatusDot status={s} />
                <span className="text-[10px] text-text-muted">
                  {agg.counts[s]}
                </span>
              </div>
            ))}
          {agg.total === 0 && (
            <span className="text-[11px] text-text-dim">No tasks</span>
          )}
        </div>
        {agg.total > 0 && (
          <span className="text-[11px] font-medium text-text-muted">
            {agg.done}/{agg.total}
          </span>
        )}
      </div>
    </StatusCard>
  );
}

function RenameInline({
  initialName,
  initialDescription,
  onSave,
  onCancel,
}: {
  initialName: string;
  initialDescription: string;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  return (
    <div className="space-y-2 px-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-bg-elevated px-3 py-2 text-[13px] text-text outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border py-2 text-[13px] font-medium text-text-muted hover:bg-bg-elevated"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(name.trim(), description.trim())}
          disabled={!name.trim()}
          className="flex-1 rounded-xl bg-accent py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function NewProjectSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        className="sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="sheet-panel relative w-full max-w-md rounded-t-3xl border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="flex justify-center pt-2 pb-1">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="px-5 pt-1 pb-3">
          <h3 className="text-[15px] font-semibold text-text">New project</h3>
          <p className="mt-0.5 text-[12px] text-text-muted">
            Give it a name — you can add tasks right after.
          </p>
        </div>
        <div className="space-y-2 px-5 pb-5">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-bg-elevated px-3 py-2 text-[13px] text-text outline-none focus:border-accent"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-[13px] font-medium text-text-muted hover:bg-bg-elevated"
            >
              Cancel
            </button>
            <button
              disabled={!name.trim() || saving}
              onClick={async () => {
                setSaving(true);
                await onCreate(name.trim(), description.trim());
                setSaving(false);
              }}
              className="flex-1 rounded-xl bg-accent py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [sheetProject, setSheetProject] = useState<ProjectWithTasks | null>(null);
  const [renaming, setRenaming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await loadProjects();
    if (result.error) setError(result.error);
    else setProjects(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? projects
        : projects.filter((p) => p.status === filter),
    [filter, projects],
  );

  async function handleStatusChange(status: ProjectStatus) {
    if (!sheetProject) return;
    const projectId = sheetProject.id;
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status } : p)),
    );
    setSheetProject(null);
    await cycleProjectStatus(projectId, status);
    router.refresh();
  }

  async function handleRename(name: string, description: string) {
    if (!sheetProject || !name) return;
    const projectId = sheetProject.id;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, name, description } : p,
      ),
    );
    setRenaming(false);
    setSheetProject(null);
    await updateProjectFields(projectId, { name, description });
    router.refresh();
  }

  async function handleDelete() {
    if (!sheetProject) return;
    const projectId = sheetProject.id;
    if (!window.confirm(`Delete project "${sheetProject.name}"? This removes all tasks.`)) return;
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setSheetProject(null);
    await removeProject(projectId);
    router.refresh();
  }

  async function handleCreate(name: string, description: string) {
    const res = await addProject(name, description || undefined);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNewOpen(false);
    await load();
    router.refresh();
  }

  const sheetGroups: ActionSheetGroup[] = sheetProject
    ? renaming
      ? []
      : [
          {
            label: "Status",
            layout: "chips",
            actions: (["active", "paused", "completed", "archived"] as ProjectStatus[]).map(
              (s) => ({
                id: `status-${s}`,
                label: s.charAt(0).toUpperCase() + s.slice(1),
                colorVar: STATUS_COLOR[s],
                onSelect: () => handleStatusChange(s),
              }),
            ),
          },
          {
            actions: [
              {
                id: "open",
                label: "Open project",
                onSelect: () => {
                  const id = sheetProject.id;
                  setSheetProject(null);
                  router.push(`/dashboard/projects/${id}`);
                },
              },
              {
                id: "rename",
                label: "Rename / edit description",
                onSelect: () => setRenaming(true),
              },
              {
                id: "delete",
                label: "Delete project",
                destructive: true,
                onSelect: handleDelete,
              },
            ],
          },
        ]
    : [];

  return (
    <div className="h-full overflow-y-auto px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-2xl py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text">Projects</h1>
          <span className="text-[11px] text-text-dim">
            {projects.length} total
          </span>
        </div>

        {/* Filter chips */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-bg-elevated text-text-muted hover:border-accent/40"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-bg-elevated"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-bg-elevated px-6 py-16 text-center">
            <p className="text-[13px] text-text-muted">
              {projects.length === 0
                ? "No projects yet. Create your first one below."
                : "No projects match this filter."}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <ProjectTile
                key={p.id}
                project={p}
                onLongPress={() => {
                  setRenaming(false);
                  setSheetProject(p);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating new-project button */}
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 flex justify-center px-4">
        <button
          onClick={() => setNewOpen(true)}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-medium text-white shadow-lg hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
          New project
        </button>
      </div>

      {/* Long-press actions sheet */}
      <ActionSheet
        open={sheetProject !== null && !renaming}
        title={sheetProject?.name}
        subtitle={`${sheetProject?.tasks.length ?? 0} task${sheetProject?.tasks.length === 1 ? "" : "s"}`}
        groups={sheetGroups}
        onClose={() => setSheetProject(null)}
      />

      {/* Rename overlay (reuses sheet visuals) */}
      {sheetProject && renaming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            className="sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setRenaming(false)}
          />
          <div className="sheet-panel relative w-full max-w-md rounded-t-3xl border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="flex justify-center pt-2 pb-1">
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="px-5 pt-1 pb-3">
              <h3 className="text-[15px] font-semibold text-text">Edit project</h3>
            </div>
            <div className="pb-5">
              <RenameInline
                initialName={sheetProject.name}
                initialDescription={sheetProject.description ?? ""}
                onSave={handleRename}
                onCancel={() => setRenaming(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* New project sheet */}
      <NewProjectSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
