"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchProjects,
  createNewProject,
  deleteProject,
} from "./actions";
import type { ProjectWithCount } from "./actions";
import type { ProjectStatus } from "@/lib/types";

const STATUS_STYLE: Record<
  ProjectStatus,
  { bg: string; text: string; label: string }
> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Active" },
  paused: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Paused" },
  completed: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Completed" },
  archived: { bg: "bg-zinc-500/10", text: "text-zinc-400", label: "Archived" },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setProjects(await fetchProjects());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createNewProject(name.trim(), desc.trim());
      setName("");
      setDesc("");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this project and all its tasks?")) return;
    await deleteProject(id);
    load();
  }

  return (
    <div className="min-h-screen bg-bg px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Projects
          </h1>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
          >
            New Project
          </button>
        </div>

        {/* ---- Loading ---- */}
        {loading && (
          <p className="text-sm text-text-muted">Loading projects…</p>
        )}

        {/* ---- Empty state ---- */}
        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <span className="mb-4 text-5xl text-text-dim">○</span>
            <p className="text-sm text-text-muted">
              No projects yet. Create your first project.
            </p>
          </div>
        )}

        {/* ---- Project grid ---- */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const s = STATUS_STYLE[p.status];
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                  className="group relative flex flex-col rounded-xl border border-border-subtle bg-bg-elevated p-5 text-left transition-colors hover:border-border"
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleDelete(p.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleDelete(
                          p.id,
                          e as unknown as React.MouseEvent,
                        );
                    }}
                    className="absolute right-3 top-3 text-xs text-text-dim opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    aria-label="Delete project"
                  >
                    ✕
                  </span>

                  <h2 className="mb-1 truncate pr-6 text-sm font-medium text-text">
                    {p.name}
                  </h2>

                  {p.description ? (
                    <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-text-muted">
                      {p.description}
                    </p>
                  ) : (
                    <div className="mb-4" />
                  )}

                  <div className="mt-auto flex items-center gap-3 text-[11px]">
                    <span
                      className={`rounded-full px-2 py-0.5 ${s.bg} ${s.text}`}
                    >
                      {s.label}
                    </span>
                    <span className="text-text-dim">
                      {p.taskCount} {p.taskCount === 1 ? "task" : "tasks"}
                    </span>
                    <span className="ml-auto text-text-dim">
                      {timeAgo(p.updated_at)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- New Project Modal ---- */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-lg font-medium text-text">
              New Project
            </h2>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs text-text-muted">
                Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Project name"
                autoFocus
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            <label className="mb-6 block">
              <span className="mb-1.5 block text-xs text-text-muted">
                Description
              </span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Brief description (optional)"
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
