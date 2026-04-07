"use server";

import {
  getProject,
  listTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  updateProject,
} from "@/lib/db/queries";
import type { Project, Task, TaskStatus, TaskPriority } from "@/lib/types";

export async function fetchProjectWithTasks(
  id: string,
): Promise<{ project: Project; tasks: Task[] }> {
  const { data: project, error: pErr } = await getProject(id);
  if (pErr || !project) throw new Error(pErr ?? "Project not found");

  const { data: tasks, error: tErr } = await listTasks(id);
  if (tErr || !tasks) throw new Error(tErr ?? "Failed to fetch tasks");

  return { project, tasks };
}

export async function addTask(
  projectId: string,
  task: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assignee?: string;
  },
): Promise<Task> {
  const { data, error } = await createTask({
    project_id: projectId,
    title: task.title,
    description: task.description ?? null,
    priority: task.priority ?? "medium",
    assignee: task.assignee ?? null,
  });
  if (error || !data) throw new Error(error ?? "Failed to create task");
  return data;
}

export async function changeTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  const { data, error } = await updateTaskStatus(taskId, status);
  if (error || !data) throw new Error(error ?? "Failed to update status");
  return data;
}

export async function editTask(
  taskId: string,
  updates: Partial<
    Pick<
      Task,
      "title" | "description" | "priority" | "assignee" | "acceptance_criteria"
    >
  >,
): Promise<Task> {
  const { data, error } = await updateTask(taskId, updates);
  if (error || !data) throw new Error(error ?? "Failed to update task");
  return data;
}

export async function updateProjectDetails(
  id: string,
  updates: Partial<Pick<Project, "name" | "description">>,
): Promise<Project> {
  const { data, error } = await updateProject(id, updates);
  if (error || !data) throw new Error(error ?? "Failed to update project");
  return data;
}
