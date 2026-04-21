"use client";

import { useEffect, useRef } from "react";

export interface ActionSheetAction {
  id: string;
  label: string;
  /** Optional inline-styled color dot on the left of the row. */
  colorVar?: string;
  onSelect: () => void | Promise<void>;
  destructive?: boolean;
}

export interface ActionSheetGroup {
  /** Optional group label, rendered as a small uppercase heading. */
  label?: string;
  actions: ActionSheetAction[];
  /** Render group as a horizontal chip row (e.g. status buttons) instead of a list. */
  layout?: "list" | "chips";
}

export interface ActionSheetProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  groups: ActionSheetGroup[];
  onClose: () => void;
}

/**
 * Slide-up bottom sheet used by the long-press interaction on tasks and
 * projects. Presentational only — parents own the data + mutations and the
 * sheet just reports which action the user picked. Closing rules:
 *  - tap outside
 *  - press Escape
 *  - swipe down on the handle
 *  - selecting an action (the parent's `onSelect` typically calls onClose)
 */
export function ActionSheet({
  open,
  title,
  subtitle,
  groups,
  onClose,
}: ActionSheetProps) {
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function onHandlePointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const dy = e.clientY - dragStartY.current;
    if (dy > 60) {
      dragStartY.current = null;
      onClose();
    }
  }
  function onHandlePointerUp() {
    dragStartY.current = null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        className="sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-panel relative w-full max-w-md rounded-t-3xl border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] shadow-2xl"
      >
        <div
          className="flex justify-center pt-2 pb-1 touch-none"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
        >
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>

        {(title || subtitle) && (
          <div className="px-5 pt-1 pb-3">
            {title && (
              <h3 className="text-[15px] font-semibold text-text">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[12px] text-text-muted">{subtitle}</p>
            )}
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto px-3 pb-4">
          {groups.map((group, gi) => (
            <div key={gi} className="mb-3 last:mb-0">
              {group.label && (
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                  {group.label}
                </div>
              )}

              {group.layout === "chips" ? (
                <div className="flex flex-wrap gap-2 px-2">
                  {group.actions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        void a.onSelect();
                      }}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        a.destructive
                          ? "border-red-200 text-red-600 hover:bg-red-50"
                          : "border-border bg-bg-elevated text-text hover:border-accent/40"
                      }`}
                    >
                      {a.colorVar && (
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full"
                          style={{ background: a.colorVar }}
                        />
                      )}
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-bg-elevated">
                  {group.actions.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        void a.onSelect();
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] transition-colors hover:bg-bg-card ${
                        i > 0 ? "border-t border-border-subtle" : ""
                      } ${a.destructive ? "text-red-600" : "text-text"}`}
                    >
                      {a.colorVar && (
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: a.colorVar }}
                        />
                      )}
                      <span className="flex-1">{a.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={onClose}
            className="mt-1 w-full rounded-xl border border-border py-2.5 text-[13px] font-medium text-text-muted hover:bg-bg-elevated"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
