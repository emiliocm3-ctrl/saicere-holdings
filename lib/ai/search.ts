import { openai } from "./client";
import type { ActivityLog, Project, Task } from "@/lib/types";

const SYSTEM_PROMPT = `You are a project coordinator for a team's project management tool.

Answer the user's natural-language question using ONLY the project data provided below. Be direct and concise — no preamble, no disclaimers. If the data doesn't contain enough information to answer, say so plainly.

When referencing tasks or projects, use their actual names. If asked about status, timelines, or blockers, ground your answer in the concrete data. Prefer bullet points for lists.`;

export async function searchProjects(
  query: string,
  context: {
    projects: Project[];
    recentTasks: Task[];
    recentActivity: ActivityLog[];
  }
): Promise<string | null> {
  try {
    const contextBlock = [
      "## Projects",
      ...context.projects.map(
        (p) => `- ${p.name} (${p.status}): ${p.description ?? "no description"}`
      ),
      "",
      "## Tasks",
      ...context.recentTasks.map(
        (t) =>
          `- [${t.id}] "${t.title}" — ${t.status}, ${t.priority}` +
          (t.assignee ? `, assigned to ${t.assignee}` : "") +
          ` (project: ${t.project_id})`
      ),
      "",
      "## Recent Activity",
      ...context.recentActivity.map(
        (a) => `- [${a.event_type}] ${a.content} (${a.created_at})`
      ),
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\n${contextBlock}` },
        { role: "user", content: query },
      ],
      temperature: 0.2,
    });

    return response.choices[0]?.message?.content ?? null;
  } catch (error) {
    console.error("[search] Failed to run conversational search:", error);
    return null;
  }
}
