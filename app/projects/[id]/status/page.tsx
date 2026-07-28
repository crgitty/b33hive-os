import { notFound } from "next/navigation";
import { getProjectClientView, PROJECT_STATUS_LABELS } from "@/lib/projects/data";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ProjectClientStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectClientView(id);
  if (!project) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <div className="text-sm text-muted">B33HIVE</div>
        <h1 className="text-2xl font-medium">{project.offer_name}</h1>
        <div className="text-sm text-muted">
          Started {formatDate(project.started_at)} — {PROJECT_STATUS_LABELS[project.status]}
        </div>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="text-sm text-muted">Progress</div>
        <ul className="mt-3 flex flex-col gap-2">
          {project.phases.length === 0 && (
            <li className="text-xs text-muted">No phases published yet</li>
          )}
          {project.phases.map((p) => (
            <li
              key={p.sequence}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
            >
              <span>{p.name}</span>
              <span className={p.approved ? "text-good text-xs" : "text-muted text-xs"}>
                {p.approved ? "Approved" : "In progress"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="text-sm text-muted">Deliverables</div>
        <ul className="mt-3 flex flex-col gap-2">
          {project.deliverables.length === 0 && (
            <li className="text-xs text-muted">Nothing has been released for review yet</li>
          )}
          {project.deliverables.map((d) => (
            <li key={d.name} className="rounded-md border border-border p-3 text-sm">
              <div>{d.name}</div>
              <div className="text-xs text-muted">
                Shared {formatDate(d.client_visible_at)}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
