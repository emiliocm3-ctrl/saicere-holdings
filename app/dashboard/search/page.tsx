"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { queryProjects } from "./actions";

const EXAMPLE_QUERIES = [
  "Which tasks are blocked?",
  "What did we accomplish this week?",
  "Which projects need attention?",
  "Summarize the status of [project name]",
] as const;

type Turn = {
  id: string;
  question: string;
  answer: string | null;
  status: "pending" | "done" | "error";
  errorMessage?: string;
};

function newId() {
  return crypto.randomUUID();
}

export default function SearchPage() {
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;

    let newTurnId: string | null = null;
    setTurns((prev) => {
      if (prev.some((t) => t.status === "pending")) return prev;
      newTurnId = newId();
      return [
        ...prev,
        {
          id: newTurnId,
          question: q,
          answer: null,
          status: "pending" as const,
        },
      ];
    });
    if (!newTurnId) return;

    const id = newTurnId;
    setInput("");

    try {
      const answer = await queryProjects(q);
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, answer, status: "done" as const } : t,
        ),
      );
    } catch (e) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "error" as const,
                errorMessage:
                  e instanceof Error ? e.message : "Something went wrong.",
              }
            : t,
        ),
      );
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(input);
  };

  const empty = turns.length === 0;

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col font-sans text-[#f0f0f0]">
      <header className="mb-8 text-center">
        <h1 className="text-lg font-medium tracking-tight text-[#f0f0f0]">
          Project search
        </h1>
        <p className="mt-1 text-sm text-[#8a8a8e]">
          Ask questions in plain language about your workspace.
        </p>
      </header>

      <form onSubmit={onSubmit} className="shrink-0">
        <label htmlFor={formId} className="sr-only">
          Ask about your projects
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id={formId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your projects..."
            autoComplete="off"
            className="w-full rounded-xl border border-[#1e1e22] bg-[#131316] px-4 py-3.5 pr-12 text-[15px] text-[#f0f0f0] shadow-sm outline-none ring-[#c9a84c]/30 placeholder:text-[#5a5a5e] focus:border-[#c9a84c]/50 focus:ring-2"
          />
          <button
            type="submit"
            disabled={!input.trim() || turns.some((t) => t.status === "pending")}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[#c9a84c]/15 text-[#c9a84c] transition-colors hover:bg-[#c9a84c]/25 disabled:pointer-events-none disabled:opacity-30"
            aria-label="Send"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>

      {empty && (
        <div className="mt-8">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-[#5a5a5e]">
            Try asking
          </p>
          <ul className="flex flex-col gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    setInput(example);
                    inputRef.current?.focus();
                  }}
                  className="w-full rounded-lg border border-[#1e1e22] bg-[#131316]/80 px-4 py-3 text-left text-sm text-[#8a8a8e] transition-colors hover:border-[#c9a84c]/25 hover:text-[#f0f0f0]"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={`mt-8 flex flex-1 flex-col gap-6 ${empty ? "hidden" : ""}`}
        aria-live="polite"
      >
        {turns.map((turn) => (
          <article key={turn.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[90%] rounded-2xl rounded-br-md bg-[#c9a84c]/12 px-4 py-2.5 text-sm text-[#f0f0f0]">
                {turn.question}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-[#1e1e22] bg-[#131316] px-4 py-3 text-sm">
                {turn.status === "pending" && (
                  <div className="flex items-center gap-2 text-[#8a8a8e]">
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#2a2a2e] border-t-[#c9a84c]"
                      aria-hidden
                    />
                    <span>Thinking…</span>
                  </div>
                )}
                {turn.status === "error" && (
                  <p className="text-red-400/90">{turn.errorMessage}</p>
                )}
                {turn.status === "done" && turn.answer && (
                  <div className="whitespace-pre-wrap text-[#e8e8e8] leading-relaxed">
                    {turn.answer}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
