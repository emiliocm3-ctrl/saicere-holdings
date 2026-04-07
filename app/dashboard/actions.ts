"use server";

import { generateBriefing } from "@/lib/ai/briefing";
import { processBrainDump } from "@/lib/ai/brain-dump";
import {
  getRecentActivity,
  listProjects,
  listTasks,
  createBriefing,
  getLatestBriefing,
  createTask,
  updateTaskStatus,
  logActivity,
  createBrainDump,
  createProject,
} from "@/lib/db/queries";
import type { Briefing, BrainDumpAction } from "@/lib/types";

export async function generateDailyBriefing(): Promise<{
  data: Briefing | null;
  error: string | null;
}> {
  const [activityResult, projectsResult] = await Promise.all([
    getRecentActivity(undefined, 100),
    listProjects(),
  ]);

  if (activityResult.error || projectsResult.error) {
    return {
      data: null,
      error: activityResult.error || projectsResult.error,
    };
  }

  const allTasks = (
    await Promise.all(
      projectsResult.data!.map((p) => listTasks(p.id)),
    )
  ).flatMap((r) => r.data ?? []);

  const briefingResult = await generateBriefing(
    activityResult.data!,
    allTasks,
  );

  if (!briefingResult) {
    return { data: null, error: "AI failed to generate briefing" };
  }

  const saved = await createBriefing({
    summary: briefingResult.summary,
    accomplishments: briefingResult.accomplishments,
    blockers: briefingResult.blockers,
    next_steps: briefingResult.next_steps,
  });

  if (saved.error) return { data: null, error: saved.error };
  return { data: saved.data, error: null };
}

export async function fetchLatestBriefing(): Promise<{
  data: Briefing | null;
  error: string | null;
}> {
  const result = await getLatestBriefing();
  return { data: result.data, error: result.error };
}

export async function processBrainDumpAction(
  rawInput: string,
): Promise<{
  actions: BrainDumpAction[];
  error: string | null;
}> {
  const [projectsResult] = await Promise.all([listProjects()]);

  if (projectsResult.error) {
    return { actions: [], error: projectsResult.error };
  }

  const projects = projectsResult.data!;
  const allTasks = (
    await Promise.all(projects.map((p) => listTasks(p.id)))
  ).flatMap((r) => r.data ?? []);

  const parsed = await processBrainDump(rawInput, projects, allTasks);

  if (!parsed || parsed.length === 0) {
    return { actions: [], error: "No actionable items found" };
  }

  const projectNameToId = new Map(projects.map((p) => [p.name.toLowerCase(), p.id]));

  for (const action of parsed) {
    switch (action.type) {
      case "create_task": {
        let projectId = action.project_name
          ? projectNameToId.get(action.project_name.toLowerCase())
          : undefined;

        if (!projectId && action.project_name) {
          const newProject = await createProject({ name: action.project_name });
          if (newProject.data) {
            projectId = newProject.data.id;
            projectNameToId.set(action.project_name.toLowerCase(), projectId);
          }
        }

        if (projectId && action.task_title) {
          await createTask({
            project_id: projectId,
            title: action.task_title,
            description: action.description ?? null,
            priority: action.priority ?? "medium",
            source: "brain_dump",
          });
        }
        break;
      }

      case "update_status": {
        if (action.task_id && action.new_status) {
          await updateTaskStatus(action.task_id, action.new_status);
        } else if (action.task_title && action.new_status) {
          const match = allTasks.find(
            (t) => t.title.toLowerCase() === action.task_title!.toLowerCase(),
          );
          if (match) await updateTaskStatus(match.id, action.new_status);
        }
        break;
      }

      case "flag_blocker": {
        const projectId = action.project_name
          ? projectNameToId.get(action.project_name.toLowerCase())
          : undefined;

        await logActivity({
          event_type: "blocker",
          content: action.blocker_description ?? action.description ?? "Blocker flagged",
          project_id: projectId ?? null,
          source: "brain_dump",
        });
        break;
      }

      case "log_activity": {
        const projectId = action.project_name
          ? projectNameToId.get(action.project_name.toLowerCase())
          : undefined;

        await logActivity({
          event_type: "note",
          content: action.description ?? "Activity logged",
          project_id: projectId ?? null,
          source: "brain_dump",
        });
        break;
      }

      case "assign": {
        if (action.task_id && action.assignee) {
          const match = allTasks.find((t) => t.id === action.task_id);
          if (match) {
            await logActivity({
              event_type: "assignment",
              content: `Assigned "${match.title}" to ${action.assignee}`,
              task_id: match.id,
              source: "brain_dump",
            });
          }
        }
        break;
      }
    }
  }

  await createBrainDump({
    user_id: "system",
    raw_input: rawInput,
    processed_actions: parsed,
  });

  return { actions: parsed, error: null };
}
