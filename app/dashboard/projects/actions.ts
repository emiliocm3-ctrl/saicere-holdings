"use server";

import {
  listProjects,
  createProject,
  deleteProject as removeProject,
} from "@/lib/db/queries";
import { getServiceClient } from "@/lib/db/supabase";
import type { Project } from "@/lib/types";

export type ProjectWithCount = Project & { taskCount: number };

export async function fetchProjects(): Promise<ProjectWithCount[]> {
  const { data: projects, error } = await listProjects();
  if (error || !projects) throw new Error(error ?? "Failed to fetch projects");

  const db = getServiceClient();
  const { data: rows } = await db
    .from("tasks")
    .select("project_id");

  const counts = new Map<string, number>();
  (rows ?? []).forEach((r: { project_id: string }) => {
    counts.set(r.project_id, (counts.get(r.project_id) ?? 0) + 1);
  });

  return projects.map((p) => ({
    ...p,
    taskCount: counts.get(p.id) ?? 0,
  }));
}

export async function createNewProject(
  name: string,
  description: string,
): Promise<Project> {
  const { data, error } = await createProject({
    name,
    description: description || null,
  });
  if (error || !data) throw new Error(error ?? "Failed to create project");
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await removeProject(id);
  if (error) throw new Error(error);
}
