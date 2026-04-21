import { getServiceClient } from "./supabase";
import type {
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  TaskPriority,
  ActivityLog,
  ActivitySource,
  AttentionTask,
  BrainDump,
  BrainDumpAction,
  Briefing,
  ChatMessage,
  DashboardSnapshot,
  ProjectWithAggregate,
  RichCard,
} from "../types";

type Result<T> = { data: T; error: null } | { data: null; error: string };

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function listProjects(
  status?: ProjectStatus,
): Promise<Result<Project[]>> {
  try {
    const db = getServiceClient();
    let query = db
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as Project[], error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function getProject(id: string): Promise<Result<Project>> {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Project, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function createProject(
  fields: Pick<Project, "name"> & Partial<Pick<Project, "description" | "status">>,
): Promise<Result<Project>> {
  try {
    const db = getServiceClient();
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      name: fields.name,
      description: fields.description ?? null,
      status: fields.status ?? "active",
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await db
      .from("projects")
      .insert(row)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Project, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function updateProject(
  id: string,
  fields: Partial<Pick<Project, "name" | "description" | "status">>,
): Promise<Result<Project>> {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("projects")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Project, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function deleteProject(id: string): Promise<Result<null>> {
  try {
    const db = getServiceClient();
    const { error } = await db.from("projects").delete().eq("id", id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function listTasks(
  projectId: string,
  filters?: { status?: TaskStatus; priority?: TaskPriority },
): Promise<Result<Task[]>> {
  try {
    const db = getServiceClient();
    let query = db
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.priority) query = query.eq("priority", filters.priority);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as Task[], error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function getTask(id: string): Promise<Result<Task>> {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Task, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function createTask(
  fields: Pick<Task, "project_id" | "title"> &
    Partial<
      Pick<
        Task,
        | "description"
        | "status"
        | "assignee"
        | "priority"
        | "estimated_hours"
        | "acceptance_criteria"
        | "source"
        | "context"
      >
    >,
): Promise<Result<Task>> {
  try {
    const db = getServiceClient();
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      project_id: fields.project_id,
      title: fields.title,
      description: fields.description ?? null,
      status: fields.status ?? "backlog",
      assignee: fields.assignee ?? null,
      priority: fields.priority ?? "medium",
      estimated_hours: fields.estimated_hours ?? null,
      acceptance_criteria: fields.acceptance_criteria ?? null,
      source: fields.source ?? "manual",
      context: fields.context ?? null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await db
      .from("tasks")
      .insert(row)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Task, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function updateTask(
  id: string,
  fields: Partial<
    Pick<
      Task,
      | "title"
      | "description"
      | "status"
      | "assignee"
      | "priority"
      | "estimated_hours"
      | "acceptance_criteria"
      | "context"
    >
  >,
): Promise<Result<Task>> {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("tasks")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Task, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Result<Task>> {
  return updateTask(id, { status });
}

export async function deleteTask(id: string): Promise<Result<null>> {
  try {
    const db = getServiceClient();
    const { error } = await db.from("tasks").delete().eq("id", id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Activity Log
// ---------------------------------------------------------------------------

export async function logActivity(
  fields: Pick<ActivityLog, "event_type" | "content"> &
    Partial<Pick<ActivityLog, "task_id" | "project_id" | "source" | "metadata">>,
): Promise<Result<ActivityLog>> {
  try {
    const db = getServiceClient();
    const row = {
      id: crypto.randomUUID(),
      task_id: fields.task_id ?? null,
      project_id: fields.project_id ?? null,
      event_type: fields.event_type,
      content: fields.content,
      source: fields.source ?? "manual",
      metadata: fields.metadata ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("activity_log")
      .insert(row)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as ActivityLog, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function getRecentActivity(
  projectId?: string,
  limit = 50,
): Promise<Result<ActivityLog[]>> {
  try {
    const db = getServiceClient();
    let query = db
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as ActivityLog[], error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Brain Dumps
// ---------------------------------------------------------------------------

export async function createBrainDump(
  fields: Pick<BrainDump, "user_id" | "raw_input"> &
    Partial<Pick<BrainDump, "processed_actions">>,
): Promise<Result<BrainDump>> {
  try {
    const db = getServiceClient();
    const row = {
      id: crypto.randomUUID(),
      user_id: fields.user_id,
      raw_input: fields.raw_input,
      processed_actions: fields.processed_actions ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("brain_dumps")
      .insert(row)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as BrainDump, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function getRecentBrainDumps(
  limit = 20,
): Promise<Result<BrainDump[]>> {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("brain_dumps")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    return { data: data as BrainDump[], error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Briefings
// ---------------------------------------------------------------------------

export async function createBriefing(
  fields: Pick<Briefing, "summary" | "accomplishments" | "blockers" | "next_steps"> &
    Partial<Pick<Briefing, "project_id" | "date">>,
): Promise<Result<Briefing>> {
  try {
    const db = getServiceClient();
    const row = {
      id: crypto.randomUUID(),
      project_id: fields.project_id ?? null,
      date: fields.date ?? new Date().toISOString().slice(0, 10),
      summary: fields.summary,
      accomplishments: fields.accomplishments,
      blockers: fields.blockers,
      next_steps: fields.next_steps,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("briefings")
      .insert(row)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Briefing, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function getLatestBriefing(
  projectId?: string,
): Promise<Result<Briefing | null>> {
  try {
    const db = getServiceClient();
    let query = db
      .from("briefings")
      .select("*")
      .order("date", { ascending: false })
      .limit(1);

    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query.maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: (data as Briefing) ?? null, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function getBriefingsByDate(
  date: string,
  projectId?: string,
): Promise<Result<Briefing[]>> {
  try {
    const db = getServiceClient();
    let query = db
      .from("briefings")
      .select("*")
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as Briefing[], error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Chat Messages
// ---------------------------------------------------------------------------

export async function saveChatMessage(
  fields: Pick<ChatMessage, "user_id" | "role" | "content"> &
    Partial<Pick<ChatMessage, "rich_cards">>,
): Promise<Result<ChatMessage>> {
  try {
    const db = getServiceClient();
    const row = {
      id: crypto.randomUUID(),
      user_id: fields.user_id,
      role: fields.role,
      content: fields.content,
      rich_cards: fields.rich_cards ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("chat_messages")
      .insert(row)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as ChatMessage, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function listChatMessages(
  userId: string,
  limit = 50,
): Promise<Result<ChatMessage[]>> {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    const msgs = (data as ChatMessage[]).reverse();
    return { data: msgs, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Dashboard aggregate
// ---------------------------------------------------------------------------

const EMPTY_TASK_COUNTS: Record<TaskStatus, number> = {
  backlog: 0,
  todo: 0,
  in_progress: 0,
  review: 0,
  done: 0,
};

const ATTENTION_PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const ATTENTION_STATUS_RANK: Record<TaskStatus, number> = {
  review: 0,
  in_progress: 1,
  todo: 2,
  backlog: 3,
  done: 4,
};

export async function getDashboardSnapshot(): Promise<Result<DashboardSnapshot>> {
  try {
    const db = getServiceClient();

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString();

    const today = new Date().toISOString().slice(0, 10);

    const [projRes, taskRes, activityRes, blockerRes, doneRes, briefingRes] =
      await Promise.all([
        db.from("projects").select("*").order("updated_at", { ascending: false }),
        db.from("tasks").select("*"),
        db
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8),
        db
          .from("activity_log")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "blocker")
          .gte("created_at", weekAgoIso),
        db
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "done")
          .gte("updated_at", weekAgoIso),
        db
          .from("briefings")
          .select("*")
          .eq("date", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (projRes.error) return { data: null, error: projRes.error.message };
    if (taskRes.error) return { data: null, error: taskRes.error.message };
    if (activityRes.error) return { data: null, error: activityRes.error.message };

    const projects = (projRes.data ?? []) as Project[];
    const tasks = (taskRes.data ?? []) as Task[];
    const activity = (activityRes.data ?? []) as ActivityLog[];

    // Build a set of project_ids that have an open blocker in the last week so
    // we can glow their cards — blocker rows reference project_id.
    const { data: blockerRows } = await db
      .from("activity_log")
      .select("project_id")
      .eq("event_type", "blocker")
      .gte("created_at", weekAgoIso);
    const blockedProjectIds = new Set(
      (blockerRows ?? []).map((r) => r.project_id).filter(Boolean) as string[],
    );

    const projectsWithAgg: ProjectWithAggregate[] = projects.map((p) => {
      const projectTasks = tasks.filter((t) => t.project_id === p.id);
      const counts = { ...EMPTY_TASK_COUNTS };
      let hasUrgent = false;
      for (const t of projectTasks) {
        counts[t.status] += 1;
        if (t.priority === "urgent" && t.status !== "done") hasUrgent = true;
      }
      return {
        ...p,
        taskCounts: counts,
        totalTasks: projectTasks.length,
        doneTasks: counts.done,
        hasUrgent,
        hasBlocker: blockedProjectIds.has(p.id),
      };
    });

    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

    const attention: AttentionTask[] = tasks
      .filter(
        (t) =>
          t.status !== "done" &&
          (t.priority === "urgent" ||
            t.priority === "high" ||
            t.status === "review"),
      )
      .sort((a, b) => {
        const pA = ATTENTION_PRIORITY_RANK[a.priority];
        const pB = ATTENTION_PRIORITY_RANK[b.priority];
        if (pA !== pB) return pA - pB;
        return ATTENTION_STATUS_RANK[a.status] - ATTENTION_STATUS_RANK[b.status];
      })
      .slice(0, 5)
      .map((t) => ({ ...t, project_name: projectNameById.get(t.project_id) ?? "" }));

    const activeProjects = projects.filter((p) => p.status === "active").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;

    const snapshot: DashboardSnapshot = {
      projects: projectsWithAgg,
      attention,
      stats: {
        activeProjects,
        inProgressTasks,
        blockersThisWeek: blockerRes.count ?? 0,
        doneThisWeek: doneRes.count ?? 0,
      },
      recentActivity: activity,
      todaysBriefing: (briefingRes.data as Briefing | null) ?? null,
    };

    return { data: snapshot, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}
