import { auth } from "@clerk/nextjs/server";
import { loadDashboard } from "./actions";
import { DashboardView } from "./components/dashboard-view";

export default async function DashboardPage() {
  const { userId: _userId } = await auth();
  const result = await loadDashboard();

  if (result.error || !result.data) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error ?? "Could not load dashboard"}
        </div>
      </div>
    );
  }

  return <DashboardView snapshot={result.data} />;
}
