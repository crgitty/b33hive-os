import { getProjectOptions, getTimeSummary } from "@/lib/time/data";
import { linkTogglProject, syncToggl } from "@/lib/time/actions";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const VARIANCE_LABEL: Record<string, string> = {
  under: "Under estimate",
  on_track: "On track",
  over: "Over estimate",
};

const VARIANCE_CLASS: Record<string, string> = {
  under: "text-muted",
  on_track: "text-good",
  over: "text-bad",
};

export default async function TimePage() {
  const [summary, projectOptions] = await Promise.all([
    getTimeSummary(),
    getProjectOptions(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted">B33HIVE OS</div>
          <h1 className="text-2xl font-medium">Time</h1>
          <div className="text-sm text-muted">
            Read-only mirror of Toggl — never edited here
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <form action={syncToggl}>
            <button className="rounded-md bg-gold px-3 py-1.5 text-sm text-background">
              Sync now
            </button>
          </form>
          <div className="text-xs text-muted">
            {summary.lastSyncedAt
              ? `Last synced ${formatDateTime(summary.lastSyncedAt)}`
              : "Never synced"}
          </div>
        </div>
      </header>

      {!summary.hasAnyEntries ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          Nothing has synced yet. Click Sync now to pull time entries from Toggl.
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            {summary.rows.map((r) => (
              <div
                key={r.project_id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
              >
                <div>
                  <div className="text-sm font-medium">{r.contact_name}</div>
                  <div className="text-xs text-muted">{r.offer_name}</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-gold tabular-nums">
                      {r.hours_logged.toFixed(1)} hrs
                    </div>
                    <div className="text-xs text-muted">
                      est. {r.est_hours_min}–{r.est_hours_max}
                      {r.is_recurring ? "/mo" : ""}
                    </div>
                  </div>
                  <div className={`text-xs ${VARIANCE_CLASS[r.variance]}`}>
                    {VARIANCE_LABEL[r.variance]}
                  </div>
                </div>
              </div>
            ))}
            {summary.rows.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
                No projects yet to compare hours against.
              </div>
            )}
          </section>

          {summary.unmatched.length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <div className="text-sm text-muted">
                Unmatched Toggl projects — link these to see their hours above
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {summary.unmatched.map((u) => (
                  <form
                    key={u.toggl_project_id}
                    action={linkTogglProject}
                    className="flex items-center gap-3 rounded-md border border-border p-3 text-sm"
                  >
                    <input
                      type="hidden"
                      name="toggl_project_id"
                      value={u.toggl_project_id}
                    />
                    <input
                      type="hidden"
                      name="toggl_project_name"
                      value={u.toggl_project_name ?? ""}
                    />
                    <div className="flex-1">
                      <div>{u.toggl_project_name ?? `Toggl project ${u.toggl_project_id}`}</div>
                      <div className="text-xs text-muted">
                        {u.hours_logged.toFixed(1)} hrs logged
                      </div>
                    </div>
                    <select
                      name="project_id"
                      required
                      defaultValue=""
                      className="rounded-md border border-border bg-background p-1.5 text-xs"
                    >
                      <option value="" disabled>
                        Link to...
                      </option>
                      {projectOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-md border border-border px-2 py-1 text-xs hover:border-gold">
                      Link
                    </button>
                  </form>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
