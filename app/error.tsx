"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "#ffffff", color: "#111827", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div
        className="max-w-md rounded-xl border p-8 text-center"
        style={{ borderColor: "#e5e7eb", backgroundColor: "#f8f9fa" }}
      >
        <h2 className="mb-3 text-lg font-medium">Something went wrong</h2>
        <p className="mb-2 text-sm" style={{ color: "#6b7280" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="mb-4 text-xs" style={{ color: "#9ca3af" }}>
            Digest: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "#b8942f", color: "#ffffff" }}
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
