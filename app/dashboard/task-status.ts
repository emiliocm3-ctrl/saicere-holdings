import type { TaskStatus } from "@/lib/types";

// Pure helpers shared by client components. Kept outside "use server" modules
// because Next.js requires every export of a Server Actions file to be an
// async function.
export const TASK_STATUS_CYCLE: TaskStatus[] = [
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
