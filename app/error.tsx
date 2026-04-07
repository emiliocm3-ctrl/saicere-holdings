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
      style={{ backgroundColor: "#09090b", color: "#f0f0f0", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div
        className="max-w-md rounded-xl border p-8 text-center"
        style={{ borderColor: "#1e1e22", backgroundColor: "#131316" }}
      >
        <h2 className="mb-3 text-lg font-medium">Something went wrong</h2>
        <p className="mb-2 text-sm" style={{ color: "#8a8a8e" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="mb-4 text-xs" style={{ color: "#5a5a5e" }}>
            Digest: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "#c9a84c", color: "#09090b" }}
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "#1e1e22", color: "#8a8a8e" }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
