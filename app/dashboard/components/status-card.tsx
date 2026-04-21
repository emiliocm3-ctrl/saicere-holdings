"use client";

import type { CSSProperties } from "react";
import type { ProjectStatus, TaskStatus, TaskPriority } from "@/lib/types";

export type GradientKey =
  | ProjectStatus
  | TaskStatus
  | "progress"; // alias for task in_progress

// Maps logical status keys to the CSS variable names defined in globals.css.
// Keeping this as a small switch avoids an opaque string-interp that can
// silently fall back to no gradient.
function resolveVars(key: GradientKey): { from: string; to: string } {
  switch (key) {
    case "active":
      return { from: "var(--grad-active-from)", to: "var(--grad-active-to)" };
    case "paused":
      return { from: "var(--grad-paused-from)", to: "var(--grad-paused-to)" };
    case "completed":
      return { from: "var(--grad-completed-from)", to: "var(--grad-completed-to)" };
    case "archived":
      return { from: "var(--grad-archived-from)", to: "var(--grad-archived-to)" };
    case "backlog":
      return { from: "var(--grad-backlog-from)", to: "var(--grad-backlog-to)" };
    case "todo":
      return { from: "var(--grad-todo-from)", to: "var(--grad-todo-to)" };
    case "in_progress":
    case "progress":
      return { from: "var(--grad-progress-from)", to: "var(--grad-progress-to)" };
    case "review":
      return { from: "var(--grad-review-from)", to: "var(--grad-review-to)" };
    case "done":
      return { from: "var(--grad-done-from)", to: "var(--grad-done-to)" };
  }
}

export interface StatusCardProps {
  status: GradientKey;
  /** 0..1 — where the gradient transitions from full to faded. */
  progress?: number;
  /** Priority drives the urgency glow on top of the status tint. */
  priority?: TaskPriority | null;
  /** Any blocker flagged on this entity also triggers the urgent glow. */
  blocked?: boolean;
  /** Use a compact chip-like variant (tasks) instead of a full card. */
  variant?: "card" | "row";
  onClick?: () => void;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Single visual primitive for everything in the project-management surface.
 * Renders a rounded container whose background is a status-tinted gradient
 * that "fills" left-to-right based on `progress` — hue communicates health,
 * fill communicates progress. Priority adds a red/orange glow on top.
 */
export function StatusCard({
  status,
  progress = 0,
  priority = null,
  blocked = false,
  variant = "card",
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onContextMenu,
  className = "",
  style,
  children,
  ariaLabel,
}: StatusCardProps) {
  const { from, to } = resolveVars(status);
  const pct = Math.max(0, Math.min(1, progress)) * 100;

  // Two stacked gradients: colored status band with a progress stop on top,
  // then a near-white veil so content stays readable against any hue.
  const backgroundImage = [
    `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.94))`,
    `linear-gradient(90deg, ${from} 0%, ${from} ${pct}%, ${to} ${pct}%, ${to} 100%)`,
  ].join(", ");

  const boxShadow =
    priority === "urgent" || blocked
      ? "var(--glow-urgent)"
      : priority === "high"
      ? "var(--glow-high)"
      : undefined;

  const base =
    variant === "card"
      ? "relative rounded-2xl border border-border/60 p-4 transition-transform active:scale-[0.99]"
      : "relative rounded-xl border border-border/60 px-3 py-2.5 transition-transform active:scale-[0.99]";

  const interactive = onClick || onPointerDown ? "cursor-pointer select-none" : "";

  return (
    <div
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`${base} ${interactive} ${className}`}
      style={{ backgroundImage, boxShadow, ...style }}
    >
      {/* subtle inner highlight so the filled portion has depth */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/40"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Small dot showing a task status color; used for per-status counts. */
export function StatusDot({ status, size = 8 }: { status: TaskStatus; size?: number }) {
  const { from } = resolveVars(status);
  return (
    <span
      aria-hidden
      className="inline-block rounded-full"
      style={{ width: size, height: size, background: from }}
    />
  );
}
