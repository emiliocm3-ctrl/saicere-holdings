"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import type {
  ActivityLog,
  Project,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";
import {
  ActionSheet,
  type ActionSheetGroup,
} from "../../components/action-sheet";
import { StatusCard } from "../../components/status-card";
import {
  advanceTaskStatus,
  cycleProjectStatus,
  nextTaskStatus,
  updateProjectFields,
} from "../../actions";
import {
  deleteTask as deleteTaskAction,
  logBlocker,
  quickAddTask,
  updateTaskFields,
} from "./actions";

const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
];

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: "var(--grad-backlog-from)",
  todo: "var(--grad-todo-from)",
  in_progress: "var(--grad-progress-from)",
  review: "var(--grad-review-from)",
  done: "var(--grad-done-from)",
};

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  active: "var(--grad-active-from)",
  paused: "var(--grad-paused-from)",
  completed: "var(--grad-completed-from)",
  archived: "var(--grad-archived-from)",
};

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: "#94a3b8",
  medium: "#0ea5e9",
  high: "#fb923c",
  urgent: "#ef4444",
};

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

function TaskRow({
  task,
  onTap,
  onLongPress,
  pending,
}: {
  task: Task;
  onTap: () => void;
  onLongPress: () => void;
  pending: boolean;
}) {
  const lp = useLongPress(onLongPress);

  return (
    <StatusCard
      status={task.status}
      progress={task.status === "done" ? 1 : task.status === "review" ? 0.75 : task.status === "in_progress" ? 0.5 : task.status === "todo" ? 0.25 : 0.05}
      priority={task.priority}
      variant="row"
      className={pending ? "opacity-60" : ""}
      onClick={() => {
        if (lp.wasTriggered()) return;
        onTap();
      }}
      onPointerDown={lp.onPointerDown}
      onPointerUp={lp.onPointerUp}
      onPointerLeave={lp.onPointerLeave}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      ariaLabel={`${task.title} — tap to advance, long-press for options`}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[13px] font-medium ${
              task.status === "done"
                ? "text-text-muted line-through"
                : "text-text"
            }`}
          >
            {task.title}
          </p>
          {task.assignee && (
            <p className="truncate text-[11px] text-text-muted">
              @{task.assignee}
            </p>
          )}
        </div>
        {task.priority !== "medium" && (
          <span
            aria-hidden
            className="shrink-0 text-[10px] font-semibold uppercase"
            style={{ color: PRIORITY_COLOR[task.priority] }}
          >
            {task.priority}
          </span>
        )}
      </div>
    </StatusCard>
  );
}

function EditTaskInline({
  task,
  onSave,
  onCancel,
}: {
  task: Task;
  onSave: (fields: { title: string; description: string; assignee: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assignee, setAssignee] = useState(task.assignee ?? "");

  return (
    <div className="space-y-2 px-2">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-bg-elevated px-3 py-2 text-[13px] text-text outline-none focus:border-accent"
      />
      <input
        type="text"
        value={assignee}
        onChange={(e) => setAssignee(e.target.value)}
        placeholder="Assignee (optional)"
        className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2 text-[13px] text-text outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border py-2 text-[13px] font-medium text-text-muted hover:bg-bg-elevated"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({
              title: title.trim(),
              description: description.trim(),
              assignee: assignee.trim(),
            })
          }
          disabled={!title.trim()}
          className="flex-1 rounded-xl bg-accent py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function BlockerInline({
  onSave,
  onCancel,
}: {
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState("");

  return (
    <div className="space-y-2 px-2">
      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's blocking this?"
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
          onClick={() => onSave(content.trim())}
          disabled={!content.trim()}
          className="flex-1 rounded-xl bg-accent py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Log blocker
        </button>
      </div>
    </div>
  );
}

type SheetMode =
  | { kind: "task"; task: Task; stage: "main" | "edit" | "blocker" }
  | { kind: "project"; stage: "main" | "edit" };

export function ProjectDetailView({
  project: initialProject,
  initialTasks,
  activity,
}: {
  project: Project;
  initialTasks: Task[];
  activity: ActivityLog[];
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTitle, setNewTitle] = useState("");
  const [adding, startAdding] = useTransition();
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<SheetMode | null>(null);

  const projectLongPress = useLongPress(() =>
    setSheet({ kind: "project", stage: "main" }),
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of tasks) grouped[t.status].push(t);
    return grouped;
  }, [tasks]);

  const doneCount = tasksByStatus.done.length;
  const totalCount = tasks.length;
  const progress = totalCount === 0 ? 0 : doneCount / totalCount;
  const hasUrgent = tasks.some(
    (t) => t.priority === "urgent" && t.status !== "done",
  );

  async function handleAdvance(task: Task) {
    if (pendingTaskIds.has(task.id)) return;

    const target = nextTaskStatus(task.status);
    setPendingTaskIds((p) => new Set(p).add(task.id));
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: target } : t)),
    );

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }

    const res = await advanceTaskStatus(task.id, target, {
      projectId: project.id,
      taskTitle: task.title,
      fromStatus: task.status,
    });

    setPendingTaskIds((p) => {
      const next = new Set(p);
      next.delete(task.id);
      return next;
    });

    if (res.error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: task.status } : t,
        ),
      );
    }
    router.refresh();
  }

  async function handleSetTaskStatus(task: Task, status: TaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status } : t)),
    );
    setSheet(null);
    await advanceTaskStatus(task.id, status, {
      projectId: project.id,
      taskTitle: task.title,
      fromStatus: task.status,
    });
    router.refresh();
  }

  async function handleSetTaskPriority(task: Task, priority: TaskPriority) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, priority } : t)),
    );
    setSheet(null);
    await updateTaskFields(task.id, project.id, { priority });
    router.refresh();
  }

  async function handleEditTask(
    task: Task,
    fields: { title: string; description: string; assignee: string },
  ) {
    const assignee = fields.assignee || null;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              title: fields.title,
              description: fields.description || null,
              assignee,
            }
          : t,
      ),
    );
    setSheet(null);
    await updateTaskFields(task.id, project.id, {
      title: fields.title,
      description: fields.description,
      assignee,
    });
    router.refresh();
  }

  async function handleDeleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setSheet(null);
    await deleteTaskAction(task.id, project.id, task.title);
    router.refresh();
  }

  async function handleLogBlocker(task: Task, content: string) {
    setSheet(null);
    await logBlocker(project.id, task.id, content);
    router.refresh();
  }

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");

    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      project_id: project.id,
      title,
      description: null,
      status: "todo",
      assignee: null,
      priority: "medium",
      estimated_hours: null,
      acceptance_criteria: null,
      source: "manual",
      context: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks((prev) => [optimistic, ...prev]);

    startAdding(async () => {
      const res = await quickAddTask(project.id, title);
      if (res.data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === optimistic.id ? res.data! : t)),
        );
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== optimistic.id));
      }
      router.refresh();
    });
  }

  async function handleProjectStatus(status: ProjectStatus) {
    setProject((p) => ({ ...p, status }));
    setSheet(null);
    await cycleProjectStatus(project.id, status);
    router.refresh();
  }

  async function handleProjectEdit(name: string, description: string) {
    setProject((p) => ({ ...p, name, description }));
    setSheet(null);
    await updateProjectFields(project.id, { name, description });
    router.refresh();
  }

  const sheetGroups: ActionSheetGroup[] = (() => {
    if (!sheet) return [];

    if (sheet.kind === "task") {
      if (sheet.stage !== "main") return []; // handled by inline overlays below

      return [
        {
          label: "Set status",
          layout: "chips",
          actions: TASK_STATUSES.map((s) => ({
            id: `s-${s}`,
            label: TASK_STATUS_LABEL[s],
            colorVar: TASK_STATUS_COLOR[s],
            onSelect: () => handleSetTaskStatus(sheet.task, s),
          })),
        },
        {
          label: "Priority",
          layout: "chips",
          actions: PRIORITIES.map((p) => ({
            id: `p-${p}`,
            label: p.charAt(0).toUpperCase() + p.slice(1),
            colorVar: PRIORITY_COLOR[p],
            onSelect: () => handleSetTaskPriority(sheet.task, p),
          })),
        },
        {
          actions: [
            {
              id: "edit",
              label: "Edit title / description / assignee",
              onSelect: () =>
                setSheet({ kind: "task", task: sheet.task, stage: "edit" }),
            },
            {
              id: "blocker",
              label: "Log blocker",
              onSelect: () =>
                setSheet({ kind: "task", task: sheet.task, stage: "blocker" }),
            },
            {
              id: "delete",
              label: "Delete task",
              destructive: true,
              onSelect: () => handleDeleteTask(sheet.task),
            },
          ],
        },
      ];
    }

    // project sheet
    if (sheet.stage !== "main") return [];
    return [
      {
        label: "Project status",
        layout: "chips",
        actions: (["active", "paused", "completed", "archived"] as ProjectStatus[]).map(
          (s) => ({
            id: `ps-${s}`,
            label: s.charAt(0).toUpperCase() + s.slice(1),
            colorVar: PROJECT_STATUS_COLOR[s],
            onSelect: () => handleProjectStatus(s),
          }),
        ),
      },
      {
        actions: [
          {
            id: "edit",
            label: "Rename / edit description",
            onSelect: () => setSheet({ kind: "project", stage: "edit" }),
          },
        ],
      },
    ];
  })();

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-4 py-4">
        {/* Back + header */}
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted hover:text-text"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M9 3L4 7l5 4" />
          </svg>
          All projects
        </Link>

        {/* Project header card */}
        <StatusCard
          status={project.status}
          progress={progress}
          priority={hasUrgent ? "urgent" : null}
          onPointerDown={projectLongPress.onPointerDown}
          onPointerUp={projectLongPress.onPointerUp}
          onPointerLeave={projectLongPress.onPointerLeave}
          onContextMenu={(e) => {
            e.preventDefault();
            setSheet({ kind: "project", stage: "main" });
          }}
          ariaLabel={`${project.name} — long-press for options`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-text">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-1 text-[12px] text-text-muted">
                  {project.description}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-text-muted capitalize">
              {project.status}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
            <span>
              {doneCount}/{totalCount} tasks done
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
        </StatusCard>

        {/* Quick add */}
        <form
          onSubmit={handleQuickAdd}
          className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2"
        >
          <span className="text-accent">+</span>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Quick add a task..."
            className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-dim outline-none"
            disabled={adding}
          />
          {newTitle.trim() && (
            <button
              type="submit"
              disabled={adding}
              className="rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-white transition-opacity disabled:opacity-50"
            >
              Add
            </button>
          )}
        </form>

        {/* Tasks grouped by status */}
        <div className="space-y-3">
          {TASK_STATUSES.map((status) => {
            const list = tasksByStatus[status];
            if (list.length === 0) return null;

            return (
              <section key={status}>
                <div className="mb-1.5 flex items-center gap-2 px-1">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: TASK_STATUS_COLOR[status] }}
                  />
                  <h2 className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                    {TASK_STATUS_LABEL[status]}
                  </h2>
                  <span className="text-[10px] text-text-dim">
                    {list.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {list.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onTap={() => handleAdvance(task)}
                      onLongPress={() =>
                        setSheet({ kind: "task", task, stage: "main" })
                      }
                      pending={pendingTaskIds.has(task.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {tasks.length === 0 && (
            <div className="rounded-xl border border-border bg-bg-elevated px-6 py-14 text-center">
              <p className="text-[13px] text-text-muted">
                No tasks yet. Use the quick-add above or ask Saicere in chat.
              </p>
            </div>
          )}
        </div>

        {/* Recent activity */}
        {activity.length > 0 && (
          <section className="pt-2">
            <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
              Activity
            </h2>
            <div className="rounded-xl border border-border bg-bg-elevated px-3 py-1.5">
              {activity.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-start gap-2 py-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <p className="min-w-0 flex-1 text-[12px] text-text">
                    <span className="text-text-muted">[{a.event_type}]</span>{" "}
                    {a.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Main sheet */}
      <ActionSheet
        open={sheet !== null && (sheet.kind === "task" ? sheet.stage === "main" : sheet.stage === "main")}
        title={
          sheet?.kind === "task"
            ? sheet.task.title
            : sheet?.kind === "project"
            ? project.name
            : undefined
        }
        subtitle={
          sheet?.kind === "task"
            ? `${TASK_STATUS_LABEL[sheet.task.status]} · ${sheet.task.priority}`
            : sheet?.kind === "project"
            ? `${totalCount} task${totalCount === 1 ? "" : "s"}`
            : undefined
        }
        groups={sheetGroups}
        onClose={() => setSheet(null)}
      />

      {/* Task edit overlay */}
      {sheet?.kind === "task" && sheet.stage === "edit" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            className="sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSheet(null)}
          />
          <div className="sheet-panel relative w-full max-w-md rounded-t-3xl border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="flex justify-center pt-2 pb-1">
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="px-5 pt-1 pb-3">
              <h3 className="text-[15px] font-semibold text-text">Edit task</h3>
            </div>
            <div className="pb-5">
              <EditTaskInline
                task={sheet.task}
                onSave={(fields) => handleEditTask(sheet.task, fields)}
                onCancel={() => setSheet(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Blocker overlay */}
      {sheet?.kind === "task" && sheet.stage === "blocker" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            className="sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSheet(null)}
          />
          <div className="sheet-panel relative w-full max-w-md rounded-t-3xl border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="flex justify-center pt-2 pb-1">
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="px-5 pt-1 pb-3">
              <h3 className="text-[15px] font-semibold text-text">Log blocker</h3>
              <p className="mt-0.5 text-[12px] text-text-muted">
                {sheet.task.title}
              </p>
            </div>
            <div className="pb-5">
              <BlockerInline
                onSave={(content) => handleLogBlocker(sheet.task, content)}
                onCancel={() => setSheet(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Project edit overlay */}
      {sheet?.kind === "project" && sheet.stage === "edit" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            className="sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSheet(null)}
          />
          <div className="sheet-panel relative w-full max-w-md rounded-t-3xl border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="flex justify-center pt-2 pb-1">
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="px-5 pt-1 pb-3">
              <h3 className="text-[15px] font-semibold text-text">Edit project</h3>
            </div>
            <div className="pb-5">
              <ProjectEditInline
                name={project.name}
                description={project.description ?? ""}
                onSave={handleProjectEdit}
                onCancel={() => setSheet(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectEditInline({
  name: initialName,
  description: initialDescription,
  onSave,
  onCancel,
}: {
  name: string;
  description: string;
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
        placeholder="Description"
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
