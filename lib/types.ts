export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ActivitySource = "manual" | "brain_dump" | "github" | "slack" | "ai";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: string | null;
  priority: TaskPriority;
  estimated_hours: number | null;
  acceptance_criteria: string | null;
  source: ActivitySource;
  context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  task_id: string | null;
  project_id: string | null;
  event_type: string;
  content: string;
  source: ActivitySource;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface BrainDump {
  id: string;
  user_id: string;
  raw_input: string;
  processed_actions: BrainDumpAction[] | null;
  created_at: string;
}

export interface BrainDumpAction {
  type:
    | "create_task"
    | "update_status"
    | "flag_blocker"
    | "log_activity"
    | "assign";
  project_name?: string;
  task_title?: string;
  task_id?: string;
  new_status?: TaskStatus;
  assignee?: string;
  description?: string;
  priority?: TaskPriority;
  blocker_description?: string;
}

export interface Briefing {
  id: string;
  project_id: string | null;
  date: string;
  summary: string;
  accomplishments: string[];
  blockers: string[];
  next_steps: string[];
  created_at: string;
}
