import {
  approveQC,
  incrementRevision,
  setClientVisible,
} from "@/lib/projects/actions";
import { formatDate } from "@/lib/dates";
import type { Deliverable } from "@/lib/projects/data";

export function DeliverableRow({
  deliverable,
  projectId,
}: {
  deliverable: Deliverable;
  projectId: string;
}) {
  const qcApproved = !!deliverable.internal_qc_approved_at;
  const clientVisible = !!deliverable.client_visible_at;

  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span>{deliverable.name}</span>
        {deliverable.revision_count > 0 && (
          <span className="text-xs text-muted">
            {deliverable.revision_count} rev.
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {qcApproved ? (
          <span className="text-good">
            QC approved {formatDate(deliverable.internal_qc_approved_at!)}
          </span>
        ) : (
          <form action={approveQC.bind(null, deliverable.id, projectId)}>
            <button className="rounded border border-border px-2 py-1 hover:border-gold">
              Approve QC
            </button>
          </form>
        )}

        {clientVisible ? (
          <form action={setClientVisible.bind(null, deliverable.id, projectId, false)}>
            <button className="rounded border border-border px-2 py-1 text-gold hover:border-gold">
              Client-visible — hide
            </button>
          </form>
        ) : (
          <form action={setClientVisible.bind(null, deliverable.id, projectId, true)}>
            <button
              disabled={!qcApproved}
              className="rounded border border-border px-2 py-1 hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
              title={qcApproved ? undefined : "Requires QC approval first"}
            >
              Make client-visible
            </button>
          </form>
        )}

        <form
          action={incrementRevision.bind(
            null,
            deliverable.id,
            projectId,
            deliverable.revision_count,
          )}
        >
          <button className="rounded border border-border px-2 py-1 hover:border-gold">
            +1 revision
          </button>
        </form>
      </div>
    </div>
  );
}
