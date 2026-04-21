"use server";

import { revalidatePath } from "next/cache";
import {
  createTask,
  deleteTask as deleteTaskQuery,
  getProject,
  getRecentActivity,
  listTasks,
  logActivity,
  updateTask,
} from "@/lib/db/queries";
import type {
  ActivityLog,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

function revalidateProjectSurfaces(projectId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function loadProject(projectId: string): Promise<{
  data: {
    project: Project;
    tasks: Task[];
    activity: ActivityLog[];
  } | null;
  error: string | null;
}> {
  try {
    const [projRes, taskRes, actRes] = await Promise.all([
      getProject(projectId),
      listTasks(projectId),
      getRecentActivity(projectId, 20),
    ]);

    if (projRes.error) return { data: null, error: projRes.error };
    if (!projRes.data) return { data: null, error: "Project not found" };
    if (taskRes.error) return { data: null, error: taskRes.error };
    if (actRes.error) return { data: null, error: actRes.error };

    return {
      data: {
        project: projRes.data,
        tasks: taskRes.data ?? [],
        activity: actRes.data ?? [],
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function quickAddTask(
  projectId: string,
  title: string,
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const trimmed = title.trim();
    if (!trimmed) return { data: null, error: "Title is required" };

    const res = await createTask({
      project_id: projectId,
      title: trimmed,
      status: "todo",
      source: "manual",
    });
    if (res.error) return { data: null, error: res.error };

    await logActivity({
      event_type: "task_created",
      content: `New task: ${trimmed}`,
      task_id: res.data.id,
      project_id: projectId,
      source: "manual",
    });

    revalidateProjectSurfaces(projectId);
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function updateTaskFields(
  taskId: string,
  projectId: string,
  fields: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    assignee?: string | null;
    status?: TaskStatus;
  },
): Promise<{ data: Task | null; error: string | null }> {
  try {
    // Supabase update() rejects undefined values for nullable cols — strip them.
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) cleaned[k] = v;
    }

    const res = await updateTask(taskId, cleaned);
    if (res.error) return { data: null, error: res.error };

    revalidateProjectSurfaces(projectId);
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function deleteTask(
  taskId: string,
  projectId: string,
  taskTitle?: string,
): Promise<{ error: string | null }> {
  try {
    const res = await deleteTaskQuery(taskId);
    if (res.error) return { error: res.error };

    await logActivity({
      event_type: "task_deleted",
      content: taskTitle ? `Deleted task: ${taskTitle}` : "Task deleted",
      project_id: projectId,
      source: "manual",
    });

    revalidateProjectSurfaces(projectId);
    return { error: null };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function logBlocker(
  projectId: string,
  taskId: string | null,
  content: string,
): Promise<{ error: string | null }> {
  try {
    if (!content.trim()) return { error: "Blocker description required" };

    const res = await logActivity({
      event_type: "blocker",
      content: content.trim(),
      project_id: projectId,
      task_id: taskId ?? undefined,
      source: "manual",
    });
    if (res.error) return { error: res.error };

    revalidateProjectSurfaces(projectId);
    return { error: null };
  } catch (e) {
    return { error: String(e) };
  }
}
