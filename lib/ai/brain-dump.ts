import { openai } from "./client";
import type { BrainDumpAction, Project, Task } from "@/lib/types";

const SYSTEM_PROMPT = `You are a project management assistant that parses brain dumps into structured actions.

Given a raw text brain dump and context about existing projects and tasks, extract every actionable item into one of these action types:

- "create_task": A new work item was mentioned. Include project_name, task_title, description, and priority (low/medium/high/urgent).
- "update_status": A task's status changed (e.g. "finished X" → done, "started X" → in_progress, "need to review X" → review). Include task_title or task_id and new_status (backlog/todo/in_progress/review/done). Match to existing tasks when possible.
- "flag_blocker": Something is blocked or waiting on external input. Include task_title (if applicable), blocker_description, and project_name.
- "log_activity": General progress note that doesn't fit the above. Include description and optionally project_name.
- "assign": Someone was mentioned as responsible for a task. Include task_title or task_id and assignee.

Rules:
- Match mentioned work to existing projects/tasks by name when the intent is clear.
- If a project is mentioned but doesn't exist, still include project_name so it can be created upstream.
- One brain dump can produce multiple actions.
- Be generous with extraction — capture everything actionable.
- Return valid JSON: { "actions": [ ...array of action objects... ] }`;

export async function processBrainDump(
  rawText: string,
  projects: Project[],
  recentTasks: Task[]
): Promise<BrainDumpAction[] | null> {
  try {
    const contextBlock = [
      "## Existing Projects",
      ...projects.map((p) => `- ${p.name} (${p.status}): ${p.description ?? "no description"}`),
      "",
      "## Recent Tasks",
      ...recentTasks.map(
        (t) => `- [${t.id}] "${t.title}" (${t.status}, ${t.priority}) — project ${t.project_id}`
      ),
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Context:\n${contextBlock}\n\n---\n\nBrain dump:\n${rawText}`,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { actions: BrainDumpAction[] };
    return parsed.actions;
  } catch (error) {
    console.error("[brain-dump] Failed to process brain dump:", error);
    return null;
  }
}
