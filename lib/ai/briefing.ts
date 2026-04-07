import { openai } from "./client";
import type { ActivityLog, Task } from "@/lib/types";

interface BriefingResult {
  summary: string;
  accomplishments: string[];
  blockers: string[];
  next_steps: string[];
}

const SYSTEM_PROMPT = `You are an executive briefing assistant for a project management tool.

Given recent activity logs and current tasks, synthesize a concise daily briefing a CEO could absorb in 30 seconds.

Guidelines:
- summary: 1–2 sentences capturing the overall state. Lead with what matters most.
- accomplishments: Concrete things that got done. Use past tense. No fluff.
- blockers: Anything stalled, waiting, or at risk. Be specific about what's needed to unblock.
- next_steps: The highest-leverage actions for today. Prioritize ruthlessly.
- If a project filter is given, focus exclusively on that project.
- Omit empty categories rather than padding them.

Return valid JSON: { "summary": "...", "accomplishments": [...], "blockers": [...], "next_steps": [...] }`;

export async function generateBriefing(
  activityLogs: ActivityLog[],
  tasks: Task[],
  projectFilter?: string | null
): Promise<BriefingResult | null> {
  try {
    const lines: string[] = [];

    if (projectFilter) {
      lines.push(`Focus: project "${projectFilter}"\n`);
    }

    lines.push("## Recent Activity");
    for (const log of activityLogs) {
      lines.push(`- [${log.event_type}] ${log.content} (${log.created_at})`);
    }

    lines.push("\n## Current Tasks");
    for (const task of tasks) {
      lines.push(
        `- "${task.title}" — ${task.status}, ${task.priority} priority` +
          (task.assignee ? `, assigned to ${task.assignee}` : "")
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: lines.join("\n") },
      ],
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as BriefingResult;
  } catch (error) {
    console.error("[briefing] Failed to generate briefing:", error);
    return null;
  }
}
