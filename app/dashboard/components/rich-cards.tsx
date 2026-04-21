"use client";

import type { RichCard } from "@/lib/types";

function BriefingCard({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as string | undefined;
  const accomplishments = data.accomplishments as string[] | undefined;
  const blockers = data.blockers as string[] | undefined;
  const nextSteps = data.next_steps as string[] | undefined;

  return (
    <div className="rounded-xl border border-border bg-bg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
          Briefing
        </span>
      </div>
      {summary && <p className="text-sm leading-relaxed text-text">{summary}</p>}
      {accomplishments && accomplishments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-emerald-600 mb-1">Accomplishments</p>
          <ul className="space-y-1">
            {accomplishments.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {blockers && blockers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-600 mb-1">Blockers</p>
          <ul className="space-y-1">
            {blockers.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {nextSteps && nextSteps.length > 0 && (
        <div>
          <p className="text-xs font-medium text-accent mb-1">Next Steps</p>
          <ul className="space-y-1">
            {nextSteps.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TaskListCard({ data }: { data: Record<string, unknown> }) {
  const tasks = data.tasks as Array<{
    title: string;
    status: string;
    priority?: string;
  }> | undefined;
  const projectName = data.project_name as string | undefined;

  const statusColors: Record<string, string> = {
    backlog: "bg-gray-400",
    todo: "bg-blue-500",
    in_progress: "bg-amber-500",
    review: "bg-purple-500",
    done: "bg-emerald-500",
  };

  return (
    <div className="rounded-xl border border-border bg-bg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
          <rect x="1" y="1" width="12" height="12" rx="2" />
          <path d="M4 7h6M4 4.5h6M4 9.5h4" />
        </svg>
        <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
          {projectName ? `Tasks — ${projectName}` : "Tasks"}
        </span>
      </div>
      {tasks && tasks.length > 0 ? (
        <ul className="space-y-1.5">
          {tasks.map((t, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusColors[t.status] ?? "bg-gray-400"}`} />
              <span className="text-text flex-1 truncate">{t.title}</span>
              <span className="text-[11px] text-text-dim">{t.status.replace("_", " ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-dim">No tasks</p>
      )}
    </div>
  );
}

function ProjectCard({ data }: { data: Record<string, unknown> }) {
  const name = data.name as string | undefined;
  const description = data.description as string | undefined;
  const status = data.status as string | undefined;
  const taskCount = data.task_count as number | undefined;

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text">{name ?? "Project"}</h3>
        {status && (
          <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent">
            {status}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-sm text-text-muted leading-relaxed">{description}</p>
      )}
      {taskCount !== undefined && (
        <p className="mt-2 text-xs text-text-dim">{taskCount} task{taskCount !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}

function ConfirmationCard({ data }: { data: Record<string, unknown> }) {
  const message = data.message as string | undefined;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600">
          <circle cx="7" cy="7" r="6" />
          <path d="M4.5 7l2 2L9.5 5" />
        </svg>
        <span className="text-sm text-emerald-700">{message ?? "Done"}</span>
      </div>
    </div>
  );
}

const CARD_RENDERERS: Record<string, React.FC<{ data: Record<string, unknown> }>> = {
  briefing: BriefingCard,
  task_list: TaskListCard,
  project_card: ProjectCard,
  confirmation: ConfirmationCard,
};

export function RichCardRenderer({ cards }: { cards: RichCard[] }) {
  return (
    <div className="mt-2 space-y-2">
      {cards.map((card, i) => {
        const Renderer = CARD_RENDERERS[card.type];
        if (!Renderer) return null;
        return <Renderer key={i} data={card.data} />;
      })}
    </div>
  );
}
