"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { runAgent } from "@/lib/ai/agent";
import { transcribeAudio } from "@/lib/ai/transcribe";
import {
  createBriefing,
  getDashboardSnapshot,
  getLatestBriefing,
  getRecentActivity,
  listChatMessages,
  listProjects,
  listTasks,
  logActivity,
  saveChatMessage,
  updateProject,
  updateTaskStatus,
} from "@/lib/db/queries";
import type {
  Briefing,
  ChatMessage,
  DashboardSnapshot,
  ProjectStatus,
  RichCard,
  Task,
  TaskStatus,
} from "@/lib/types";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

function parseRichCards(content: string): RichCard[] | null {
  const cards: RichCard[] = [];
  const codeBlockRegex = /```rich:(\w+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    try {
      cards.push({
        type: match[1] as RichCard["type"],
        data: JSON.parse(match[2]),
      });
    } catch {
      // skip malformed blocks
    }
  }

  return cards.length > 0 ? cards : null;
}

function stripRichBlocks(content: string): string {
  return content.replace(/```rich:\w+\n[\s\S]*?```/g, "").trim();
}

export async function sendMessage(
  content: string,
): Promise<{ data: ChatMessage | null; error: string | null }> {
  try {
    const { userId } = await auth();
    const uid = userId ?? "anonymous";

    await saveChatMessage({ user_id: uid, role: "user", content });

    const historyResult = await listChatMessages(uid, 30);
    const history = historyResult.data ?? [];

    const messages: ChatCompletionMessageParam[] = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const agentResponse = await runAgent(messages);

    const richCards = parseRichCards(agentResponse.content);
    const cleanContent = richCards
      ? stripRichBlocks(agentResponse.content)
      : agentResponse.content;

    const saved = await saveChatMessage({
      user_id: uid,
      role: "assistant",
      content: cleanContent || agentResponse.content,
      rich_cards: richCards,
    });

    if (saved.error) return { data: null, error: saved.error };
    return { data: saved.data, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function transcribeVoice(
  formData: FormData,
): Promise<{ text: string | null; error: string | null }> {
  try {
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) return { text: null, error: "No audio file" };

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const text = await transcribeAudio(buffer, audioFile.type);
    return { text, error: null };
  } catch (e) {
    return { text: null, error: String(e) };
  }
}

export async function loadChatHistory(): Promise<{
  data: ChatMessage[];
  error: string | null;
}> {
  try {
    const { userId } = await auth();
    const uid = userId ?? "anonymous";
    const result = await listChatMessages(uid, 50);
    if (result.error) return { data: [], error: result.error };
    return { data: result.data ?? [], error: null };
  } catch (e) {
    return { data: [], error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Dashboard data + mutations
// ---------------------------------------------------------------------------

export async function loadDashboard(): Promise<{
  data: DashboardSnapshot | null;
  error: string | null;
}> {
  const result = await getDashboardSnapshot();
  if (result.error) return { data: null, error: result.error };
  return { data: result.data, error: null };
}

const TASK_STATUS_CYCLE: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
];

export function nextTaskStatus(current: TaskStatus): TaskStatus {
  const idx = TASK_STATUS_CYCLE.indexOf(current);
  return TASK_STATUS_CYCLE[(idx + 1) % TASK_STATUS_CYCLE.length];
}

function revalidateProjectSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
}

/**
 * Advance (or set) a task's status and log the change to activity_log so the
 * assistant feed and recent-activity list stay truthful. Returns the updated
 * task for optimistic UIs that want to confirm.
 */
export async function advanceTaskStatus(
  taskId: string,
  targetStatus: TaskStatus,
  opts?: { projectId?: string; taskTitle?: string; fromStatus?: TaskStatus },
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const res = await updateTaskStatus(taskId, targetStatus);
    if (res.error) return { data: null, error: res.error };

    await logActivity({
      event_type: "status_change",
      content:
        opts?.fromStatus && opts?.taskTitle
          ? `${opts.taskTitle}: ${opts.fromStatus} → ${targetStatus}`
          : `Task status changed to ${targetStatus}`,
      task_id: taskId,
      project_id: opts?.projectId,
      source: "manual",
    });

    revalidateProjectSurfaces();
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function cycleProjectStatus(
  projectId: string,
  targetStatus: ProjectStatus,
): Promise<{ error: string | null }> {
  try {
    const res = await updateProject(projectId, { status: targetStatus });
    if (res.error) return { error: res.error };

    await logActivity({
      event_type: "project_status",
      content: `Project marked ${targetStatus}`,
      project_id: projectId,
      source: "manual",
    });

    revalidateProjectSurfaces();
    return { error: null };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function updateProjectFields(
  projectId: string,
  fields: { name?: string; description?: string; status?: ProjectStatus },
): Promise<{ error: string | null }> {
  try {
    const res = await updateProject(projectId, fields);
    if (res.error) return { error: res.error };
    revalidateProjectSurfaces();
    return { error: null };
  } catch (e) {
    return { error: String(e) };
  }
}

/**
 * Generate or return today's briefing. If a briefing already exists for today
 * we return it as-is so the dashboard stays cheap; otherwise we synthesize
 * one from recent data via the AI agent prompt pipeline.
 */
export async function generateTodayBriefing(): Promise<{
  data: Briefing | null;
  error: string | null;
}> {
  try {
    const existing = await getLatestBriefing();
    const today = new Date().toISOString().slice(0, 10);
    if (existing.data && existing.data.date === today) {
      return { data: existing.data, error: null };
    }

    const [projRes, actRes] = await Promise.all([
      listProjects(),
      getRecentActivity(undefined, 50),
    ]);
    if (projRes.error || actRes.error) {
      return { data: null, error: projRes.error || actRes.error };
    }

    const projects = projRes.data ?? [];
    const allTasks = (
      await Promise.all(projects.map((p) => listTasks(p.id)))
    ).flatMap((r) => r.data ?? []);

    const dataPrompt = [
      "Summarize this snapshot as a one-paragraph briefing, plus up to 5 accomplishments, blockers, and next steps.",
      "Reply ONLY as JSON: { summary: string, accomplishments: string[], blockers: string[], next_steps: string[] }",
      "## Projects",
      ...projects.map(
        (p) => `- ${p.name} (${p.status}): ${p.description ?? "no description"}`,
      ),
      "## Open tasks",
      ...allTasks
        .filter((t) => t.status !== "done")
        .slice(0, 40)
        .map(
          (t) =>
            `- "${t.title}" — ${t.status}, ${t.priority}${t.assignee ? `, @${t.assignee}` : ""}`,
        ),
      "## Recent activity",
      ...(actRes.data ?? [])
        .slice(0, 30)
        .map((a) => `- [${a.event_type}] ${a.content}`),
    ].join("\n");

    const agentResponse = await runAgent([
      { role: "user", content: dataPrompt } as ChatCompletionMessageParam,
    ]);

    // The agent occasionally wraps JSON in prose or code fences — strip that.
    const raw = agentResponse.content.trim();
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    let parsed: {
      summary?: string;
      accomplishments?: string[];
      blockers?: string[];
      next_steps?: string[];
    } = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = { summary: raw };
    }

    const created = await createBriefing({
      summary: parsed.summary ?? "Today's briefing",
      accomplishments: parsed.accomplishments ?? [],
      blockers: parsed.blockers ?? [],
      next_steps: parsed.next_steps ?? [],
    });

    if (created.error) return { data: null, error: created.error };
    revalidatePath("/dashboard");
    return { data: created.data, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}
