import { notFound } from "next/navigation";
import { loadProject } from "./actions";
import { ProjectDetailView } from "./project-detail-view";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await loadProject(id);

  if (result.error === "Project not found") notFound();
  if (result.error || !result.data) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error ?? "Could not load project"}
        </div>
      </div>
    );
  }

  return (
    <ProjectDetailView
      project={result.data.project}
      initialTasks={result.data.tasks}
      activity={result.data.activity}
    />
  );
}
