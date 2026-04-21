import { openai, AI_MODEL } from "./client";
import {
  listProjects,
  getProject,
  createProject,
  listTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  logActivity,
  getRecentActivity,
  createBriefing,
  getLatestBriefing,
} from "@/lib/db/queries";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const SYSTEM_PROMPT = `You are Saicere's executive assistant — a sharp, concise project coordinator for an investment holding company involved in venture capital, real estate, debt, and a digital venture lab.

Your job is to keep the principal informed and up-to-date without them having to micro-manage. You handle project tracking, task management, briefings, and general workspace queries.

Personality:
- Direct and concise. No filler, no "certainly!", no "great question!".
- Use first person naturally. You're a trusted partner, not a chatbot.
- When you take actions (create tasks, log activity), confirm what you did in one line.
- For briefings and status queries, use structured formatting with bullet points.
- Speak in English by default, but match the user's language if they write in Spanish.

When the user gives you a brain dump (stream of consciousness about what happened, what's next, blockers), parse it and take the appropriate actions — create tasks, update statuses, log blockers — then confirm what you did.

When asked for a briefing or status, pull the actual data and synthesize it.

Always ground your answers in real project data from the tools. Never make up project names or task statuses.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "List all projects, optionally filtered by status",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "paused", "completed", "archived"],
            description: "Filter by project status",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_tasks",
      description: "Get all tasks for a specific project",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project UUID" },
          status: {
            type: "string",
            enum: ["backlog", "todo", "in_progress", "review", "done"],
          },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a new project",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          description: { type: "string", description: "Brief description" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task in a project",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project UUID" },
          title: { type: "string", description: "Task title" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          assignee: { type: "string" },
          status: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"] },
        },
        required: ["project_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Update a task's status",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task UUID" },
          status: {
            type: "string",
            enum: ["backlog", "todo", "in_progress", "review", "done"],
          },
        },
        required: ["task_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update task fields like title, description, priority, or assignee",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          assignee: { type: "string" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_activity",
      description: "Log a note, blocker, or activity entry",
      parameters: {
        type: "object",
        properties: {
          event_type: {
            type: "string",
            enum: ["note", "blocker", "milestone", "decision", "assignment"],
          },
          content: { type: "string", description: "What happened" },
          project_id: { type: "string", description: "Optional project UUID" },
        },
        required: ["event_type", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_briefing",
      description: "Generate a daily briefing synthesizing recent activity across all projects",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_activity",
      description: "Get recent activity log entries",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Optional project UUID filter" },
          limit: { type: "number", description: "Max entries (default 50)" },
        },
      },
    },
  },
];

import type OpenAI from "openai";
import type { TaskStatus, TaskPriority, ProjectStatus } from "@/lib/types";

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "list_projects": {
        const res = await listProjects(args.status as ProjectStatus | undefined);
        if (res.error) return JSON.stringify({ error: res.error });
        return JSON.stringify(res.data);
      }
      case "get_project_tasks": {
        const res = await listTasks(
          args.project_id as string,
          args.status ? { status: args.status as TaskStatus } : undefined,
        );
        if (res.error) return JSON.stringify({ error: res.error });
        return JSON.stringify(res.data);
      }
      case "create_project": {
        const res = await createProject({
          name: args.name as string,
          description: (args.description as string) || undefined,
        });
        if (res.error) return JSON.stringify({ error: res.error });
        return JSON.stringify(res.data);
      }
      case "create_task": {
        const res = await createTask({
          project_id: args.project_id as string,
          title: args.title as string,
          description: (args.description as string) || undefined,
          priority: (args.priority as TaskPriority) || "medium",
          assignee: (args.assignee as string) || undefined,
          status: (args.status as TaskStatus) || "backlog",
          source: "ai",
        });
        if (res.error) return JSON.stringify({ error: res.error });
        return JSON.stringify(res.data);
      }
      case "update_task_status": {
        const res = await updateTaskStatus(
          args.task_id as string,
          args.status as TaskStatus,
        );
        if (res.error) return JSON.stringify({ error: res.error });
        return JSON.stringify(res.data);
      }
      case "update_task": {
        const { task_id, ...fields } = args;
        const res = await updateTask(task_id as string, fields);
        if (res.error) return JSON.stringify({ error: res.error });
        return JSON.stringify(res.data);
      }
      case "log_activity": {
        const res = await logActivity({
          event_type: args.event_type as string,
          content: args.content as string,
          project_id: (args.project_id as string) || undefined,
          source: "ai",
        });
        if (res.error) return JSON.stringify({ error: res.error });
        return JSON.stringify({ logged: true });
      }
      case "generate_briefing": {
        const [actRes, projRes] = await Promise.all([
          getRecentActivity(undefined, 100),
          listProjects(),
        ]);
        if (actRes.error || projRes.error) {
          return JSON.stringify({ error: actRes.error || projRes.error });
        }
        const allTasks = (
          await Promise.all(projRes.data!.map((p) => listTasks(p.id)))
        ).flatMap((r) => r.data ?? []);

        const briefingPrompt = [
          "Synthesize this data into a daily briefing.",
          "## Projects",
          ...projRes.data!.map((p) => `- ${p.name} (${p.status}): ${p.description ?? "no description"}`),
          "## Tasks",
          ...allTasks.map((t) => `- "${t.title}" — ${t.status}, ${t.priority}${t.assignee ? `, @${t.assignee}` : ""} (project: ${t.project_id})`),
          "## Recent Activity",
          ...actRes.data!.slice(0, 30).map((a) => `- [${a.event_type}] ${a.content} (${a.created_at})`),
        ].join("\n");

        return briefingPrompt;
      }
      case "get_recent_activity": {
        const res = await getRecentActivity(
          args.project_id as string | undefined,
          (args.limit as number) || 50,
        );
        if (res.error) return JSON.stringify({ error: res.error });
        return JSON.stringify(res.data);
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

export interface AgentResponse {
  content: string;
  toolCalls: { name: string; args: Record<string, unknown>; result: string }[];
}

export async function runAgent(
  messages: ChatCompletionMessageParam[],
): Promise<AgentResponse> {
  const fullMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  const toolCallLog: AgentResponse["toolCalls"] = [];
  let iterations = 0;
  const MAX_ITERATIONS = 8;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: fullMessages,
      tools: TOOLS,
      temperature: 0.3,
    });

    const choice = response.choices[0];
    if (!choice) break;

    const msg = choice.message;
    fullMessages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { content: msg.content ?? "", toolCalls: toolCallLog };
    }

    for (const tc of msg.tool_calls) {
      if (tc.type !== "function") continue;
      const args = JSON.parse(tc.function.arguments || "{}");
      const result = await executeTool(tc.function.name, args);

      toolCallLog.push({ name: tc.function.name, args, result });

      fullMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }
  }

  return {
    content: "I ran into a limit processing your request. Could you try a simpler query?",
    toolCalls: toolCallLog,
  };
}
