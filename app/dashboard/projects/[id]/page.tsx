"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchProjectWithTasks,
  addTask,
  changeTaskStatus,
  editTask,
  updateProjectDetails,
} from "./actions";
import type { Project, Task, TaskStatus, TaskPriority } from "@/lib/types";

const COLUMNS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: "backlog", label: "Backlog", dot: "bg-zinc-500" },
  { key: "todo", label: "To Do", dot: "bg-zinc-300" },
  { key: "in_progress", label: "In Progress", dot: "bg-blue-500" },
  { key: "review", label: "Review", dot: "bg-amber-500" },
  { key: "done", label: "Done", dot: "bg-emerald-500" },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_STYLE: Record<
  TaskPriority,
  { bg: string; text: string; label: string }
> = {
  urgent: { bg: "bg-red-500/10", text: "text-red-400", label: "Urgent" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", label: "High" },
  medium: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Medium" },
  low: { bg: "bg-zinc-500/10", text: "text-zinc-400", label: "Low" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assignee: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { project: p, tasks: t } = await fetchProjectWithTasks(id);
      setProject(p);
      setTasks(t);
      setNameValue(p.name);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const tasksByColumn = COLUMNS.map((col) => ({
    ...col,
    items: tasks.filter((t) => t.status === col.key),
  }));

  async function handleNameSave() {
    if (
      !project ||
      !nameValue.trim() ||
      nameValue.trim() === project.name
    ) {
      setEditingName(false);
      setNameValue(project?.name ?? "");
      return;
    }
    await updateProjectDetails(project.id, { name: nameValue.trim() });
    setProject({ ...project, name: nameValue.trim() });
    setEditingName(false);
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    await changeTaskStatus(taskId, status);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
  }

  async function handleAddTask() {
    if (!project || !newTask.title.trim()) return;
    setSaving(true);
    try {
      await addTask(project.id, {
        title: newTask.title.trim(),
        description: newTask.description.trim() || undefined,
        priority: newTask.priority,
        assignee: newTask.assignee.trim() || undefined,
      });
      setNewTask({ title: "", description: "", priority: "medium", assignee: "" });
      setShowAddTask(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-muted">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* ---- Top bar ---- */}
      <div className="border-b border-border-subtle px-6 py-4 sm:px-10 lg:px-16">
        <button
          onClick={() => router.push("/dashboard/projects")}
          className="text-xs text-text-dim transition-colors hover:text-text-muted"
        >
          ← Back to Projects
        </button>
      </div>

      {/* ---- Project header ---- */}
      <div className="mx-auto max-w-7xl px-6 pb-6 pt-8 sm:px-10 lg:px-16">
        <div className="mb-2 flex items-start justify-between gap-4">
          {editingName ? (
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") {
                  setEditingName(false);
                  setNameValue(project.name);
                }
              }}
              autoFocus
              className="-mb-px border-b border-accent bg-transparent text-xl font-semibold text-text outline-none"
            />
          ) : (
            <h1
              onClick={() => setEditingName(true)}
              className="cursor-text text-xl font-semibold text-text transition-colors hover:text-accent"
            >
              {project.name}
            </h1>
          )}

          <button
            onClick={() => setShowAddTask(true)}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
          >
            Add Task
          </button>
        </div>

        {project.description && (
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
            {project.description}
          </p>
        )}
      </div>

      {/* ---- Kanban board ---- */}
      <div className="overflow-x-auto px-6 pb-10 sm:px-10 lg:px-16">
        <div className="flex min-w-max gap-4">
          {tasksByColumn.map((col) => (
            <div key={col.key} className="w-64 shrink-0">
              {/* Column header */}
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <span className="text-xs font-medium text-text-muted">
                  {col.label}
                </span>
                <span className="text-xs text-text-dim">
                  {col.items.length}
                </span>
              </div>

              {/* Task list */}
              <div className="flex flex-col gap-2">
                {col.items.map((task) => {
                  const expanded = expandedId === task.id;
                  const pri = PRIORITY_STYLE[task.priority];

                  return (
                    <div
                      key={task.id}
                      onClick={() =>
                        setExpandedId(expanded ? null : task.id)
                      }
                      className="cursor-pointer rounded-lg border border-border-subtle bg-bg-elevated p-3 transition-colors hover:border-border"
                    >
                      <p className="mb-2 text-sm font-medium leading-snug text-text">
                        {task.title}
                      </p>

                      {/* Expanded details */}
                      {expanded && (
                        <div className="mb-3 space-y-2 text-xs text-text-muted">
                          {task.description && (
                            <p className="leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          {task.acceptance_criteria && (
                            <div>
                              <span className="mb-0.5 block text-text-dim">
                                Acceptance Criteria
                              </span>
                              <p className="leading-relaxed">
                                {task.acceptance_criteria}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-text-dim">
                            <span>Source: {task.source}</span>
                            <span>Created: {fmtDate(task.created_at)}</span>
                            {task.updated_at !== task.created_at && (
                              <span>Updated: {fmtDate(task.updated_at)}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Priority + assignee */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${pri.bg} ${pri.text}`}
                        >
                          {pri.label}
                        </span>
                        {task.assignee && (
                          <span className="text-[11px] text-text-dim">
                            @{task.assignee}
                          </span>
                        )}
                      </div>

                      {/* Status selector */}
                      <select
                        value={task.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(
                            task.id,
                            e.target.value as TaskStatus,
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 w-full cursor-pointer appearance-none rounded-md border border-border bg-bg px-2 py-1 text-[11px] text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}

                {col.items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border-subtle py-8 text-center text-xs text-text-dim">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Add Task Modal ---- */}
      {showAddTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAddTask(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-lg font-medium text-text">Add Task</h2>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs text-text-muted">
                Title
              </span>
              <input
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="Task title"
                autoFocus
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs text-text-muted">
                Description
              </span>
              <textarea
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Optional description"
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            <div className="mb-6 flex gap-4">
              <label className="flex-1">
                <span className="mb-1.5 block text-xs text-text-muted">
                  Priority
                </span>
                <select
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      priority: e.target.value as TaskPriority,
                    })
                  }
                  className="w-full appearance-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <label className="flex-1">
                <span className="mb-1.5 block text-xs text-text-muted">
                  Assignee
                </span>
                <input
                  value={newTask.assignee}
                  onChange={(e) =>
                    setNewTask({ ...newTask, assignee: e.target.value })
                  }
                  placeholder="Name"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddTask(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={saving || !newTask.title.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
