import Link from "next/link";
import { getProjectsList, PROJECT_STATUS_LABELS } from "@/lib/projects/data";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjectsList();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <div className="text-sm text-muted">B33HIVE OS</div>
        <h1 className="text-2xl font-medium">Projects</h1>
      </header>

      <div className="flex flex-col gap-3">
        {projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
            No projects yet. Projects are created automatically when a deal is marked Won
            in Pipeline.
          </div>
        )}
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 hover:border-gold"
          >
            <div>
              <div className="text-sm font-medium">{p.contact_name}</div>
              <div className="text-xs text-muted">
                {p.offer_name}
                {p.contact_org ? ` — ${p.contact_org}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted">
              <span>{p.phase_count} phases</span>
              <span>{p.deliverable_count} deliverables</span>
              <span>Started {formatDate(p.started_at)}</span>
              <span className="text-gold">{PROJECT_STATUS_LABELS[p.status]}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
