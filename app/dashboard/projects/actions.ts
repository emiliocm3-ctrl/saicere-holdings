"use server";

import { listProjects, listTasks, createProject, deleteProject } from "@/lib/db/queries";
import type { Project, Task } from "@/lib/types";

export async function loadProjects(): Promise<{
  data: Array<Project & { tasks: Task[] }>;
  error: string | null;
}> {
  try {
    const projResult = await listProjects();
    if (projResult.error) return { data: [], error: projResult.error };

    const projects = projResult.data ?? [];
    const withTasks = await Promise.all(
      projects.map(async (p) => {
        const taskResult = await listTasks(p.id);
        return { ...p, tasks: taskResult.data ?? [] };
      }),
    );

    return { data: withTasks, error: null };
  } catch (e) {
    return { data: [], error: String(e) };
  }
}

export async function addProject(name: string, description?: string): Promise<{
  data: Project | null;
  error: string | null;
}> {
  try {
    const result = await createProject({ name, description });
    if (result.error) return { data: null, error: result.error };
    return { data: result.data, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function removeProject(id: string): Promise<{ error: string | null }> {
  try {
    const result = await deleteProject(id);
    return { error: result.error };
  } catch (e) {
    return { error: String(e) };
  }
}
