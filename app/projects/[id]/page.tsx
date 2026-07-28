import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectDetail, PROJECT_STATUS_LABELS } from "@/lib/projects/data";
import {
  approvePhaseGate,
  createDeliverable,
  createPhase,
  updatePhaseGateUrl,
  updateProjectStatus,
} from "@/lib/projects/actions";
import { formatDate } from "@/lib/dates";
import { DeliverableRow } from "@/app/projects/[id]/DeliverableRow";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectDetail(id);
  if (!project) notFound();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>{" "}
            / {project.contact_name}
          </div>
          <h1 className="text-2xl font-medium">{project.contact_name}</h1>
          <div className="text-sm text-muted">
            {project.offer_name} — started {formatDate(project.started_at)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/projects/${project.id}/status`}
            className="text-sm text-gold hover:underline"
          >
            View client status page
          </Link>
          <form action={updateProjectStatus} className="flex items-center gap-2">
            <input type="hidden" name="project_id" value={project.id} />
            <select
              name="status"
              defaultValue={project.status}
              className="rounded-md border border-border bg-background p-1.5 text-sm"
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="rounded-md border border-border px-2 py-1.5 text-sm hover:border-gold">
              Update
            </button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {project.phases.map((phase) => (
          <div
            key={phase.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{phase.name}</span>
              <span className="text-xs text-muted">Phase {phase.sequence}</span>
            </div>

            {phase.approved_at ? (
              <div className="text-xs text-good">
                Gate approved {formatDate(phase.approved_at)}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <form
                  action={updatePhaseGateUrl}
                  className="flex gap-1.5"
                >
                  <input type="hidden" name="phase_id" value={phase.id} />
                  <input type="hidden" name="project_id" value={project.id} />
                  <input
                    name="gate_artifact_url"
                    defaultValue={phase.gate_artifact_url ?? ""}
                    placeholder="Gate artifact URL"
                    className="flex-1 rounded-md border border-border bg-background p-1.5 text-xs"
                  />
                  <button className="rounded-md border border-border px-2 text-xs hover:border-gold">
                    Save
                  </button>
                </form>
                <form action={approvePhaseGate.bind(null, phase.id, project.id)}>
                  <button className="w-full rounded-md border border-border px-2 py-1.5 text-xs hover:border-gold">
                    Approve gate
                  </button>
                </form>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {phase.deliverables.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted">
                  No deliverables
                </div>
              )}
              {phase.deliverables.map((d) => (
                <DeliverableRow key={d.id} deliverable={d} projectId={project.id} />
              ))}
            </div>

            <form action={createDeliverable} className="flex gap-1.5">
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="phase_id" value={phase.id} />
              <input
                name="name"
                required
                placeholder="New deliverable"
                className="flex-1 rounded-md border border-border bg-background p-1.5 text-xs"
              />
              <button className="rounded-md border border-border px-2 text-xs hover:border-gold">
                Add
              </button>
            </form>
          </div>
        ))}

        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
          <span className="text-sm text-muted">Add phase</span>
          <form action={createPhase} className="flex gap-1.5">
            <input type="hidden" name="project_id" value={project.id} />
            <input
              name="name"
              required
              placeholder="Phase name"
              className="flex-1 rounded-md border border-border bg-background p-1.5 text-xs"
            />
            <button className="rounded-md border border-border px-2 text-xs hover:border-gold">
              Add
            </button>
          </form>
        </div>
      </div>

      {project.unassignedDeliverables.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="text-sm text-muted">Unassigned deliverables</div>
          <div className="mt-3 flex flex-col gap-2">
            {project.unassignedDeliverables.map((d) => (
              <DeliverableRow key={d.id} deliverable={d} projectId={project.id} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
