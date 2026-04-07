"use server";

import { searchProjects } from "@/lib/ai/search";
import { listProjects, listTasks, getRecentActivity } from "@/lib/db/queries";
import type { Task } from "@/lib/types";

export async function queryProjects(question: string): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) {
    return "Please enter a question.";
  }

  const projectsRes = await listProjects();
  if (projectsRes.error || !projectsRes.data) {
    return `Could not load projects: ${projectsRes.error ?? "unknown error"}.`;
  }

  const projects = projectsRes.data;
  const taskResults = await Promise.all(
    projects.map((p) => listTasks(p.id)),
  );

  const recentTasks: Task[] = [];
  for (const r of taskResults) {
    if (r.data) recentTasks.push(...r.data);
  }

  const activityRes = await getRecentActivity(undefined, 100);
  const recentActivity =
    activityRes.data && !activityRes.error ? activityRes.data : [];

  const answer = await searchProjects(trimmed, {
    projects,
    recentTasks,
    recentActivity,
  });

  return answer ?? "No response from the assistant. Try again.";
}
