import {
  createPilot,
  launchPilot,
  recordPilotDecision,
  updatePilotCustomerCount,
  deletePilot,
} from "@/lib/intelligence/actions";
import { PILOT_DECISION_LABELS, type PilotRow } from "@/lib/intelligence/data";
import type { ProblemOption } from "@/lib/intelligence/data";
import { formatDate } from "@/lib/dates";

const MAX_ACTIVE_PILOTS = 2;
const MIN_CUSTOMERS_FOR_DECISION = 3;

export function PilotTracker({
  pilots,
  problemOptions,
  activeCount,
}: {
  pilots: PilotRow[];
  problemOptions: ProblemOption[];
  activeCount: number;
}) {
  const atCap = activeCount >= MAX_ACTIVE_PILOTS;

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm text-muted">Pilot tracker</div>
        <div className="text-xs text-muted">
          {activeCount} of {MAX_ACTIVE_PILOTS} active pilot slots used
        </div>
      </div>

      {atCap ? (
        <div className="mt-3 rounded-md border border-dashed border-border p-3 text-xs text-muted">
          At the 2-active-pilot limit — decide one before starting another.
        </div>
      ) : (
        <form action={createPilot} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted" htmlFor="pilot_problem_id">
              Problem
            </label>
            <select
              id="pilot_problem_id"
              name="problem_id"
              required
              defaultValue=""
              className="min-w-64 rounded-md border border-border bg-background p-1.5 text-xs"
            >
              <option value="" disabled>
                Select a problem
              </option>
              {problemOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted" htmlFor="pilot_customer_count">
              Starting customers
            </label>
            <input
              id="pilot_customer_count"
              name="customer_count"
              type="number"
              min={0}
              defaultValue={0}
              className="w-24 rounded-md border border-border bg-background p-1.5 text-xs"
            />
          </div>
          <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-gold">
            Add pilot
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {pilots.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
            No pilots yet.
          </div>
        )}
        {pilots.map((p) => (
          <div
            key={p.id}
            className={`rounded-md border p-3 text-sm ${
              p.isOverdue ? "border-bad bg-bad/10" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{p.problem_description}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                  <span>{p.customer_count} paying customers</span>
                  <span className="capitalize">{p.status}</span>
                  {p.launched_at && <span>Launched {formatDate(p.launched_at)}</span>}
                  {p.decision_due_at && p.status !== "decided" && (
                    <span className={p.isOverdue ? "font-medium text-bad" : ""}>
                      {p.isOverdue
                        ? `${Math.abs(p.daysRemaining ?? 0)}d overdue`
                        : `${p.daysRemaining}d until decision due`}{" "}
                      ({formatDate(p.decision_due_at)})
                    </span>
                  )}
                  {p.decision && (
                    <span className="text-gold">
                      Decision: {PILOT_DECISION_LABELS[p.decision]}
                    </span>
                  )}
                </div>
              </div>
              <form action={deletePilot.bind(null, p.id)}>
                <button className="rounded border border-bad px-2 py-1 text-xs text-bad hover:bg-bad/10">
                  Delete
                </button>
              </form>
            </div>

            {p.status !== "decided" && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                {p.status === "planned" && (
                  <form action={launchPilot.bind(null, p.id)}>
                    <button className="rounded border border-border px-2 py-1 text-xs hover:border-gold">
                      Launch
                    </button>
                  </form>
                )}

                <form
                  action={updatePilotCustomerCount}
                  className="flex items-end gap-1.5"
                >
                  <input type="hidden" name="pilot_id" value={p.id} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">Customers</label>
                    <input
                      name="customer_count"
                      type="number"
                      min={0}
                      defaultValue={p.customer_count}
                      className="w-20 rounded-md border border-border bg-background p-1.5 text-xs"
                    />
                  </div>
                  <button className="rounded border border-border px-2 py-1 text-xs hover:border-gold">
                    Update
                  </button>
                </form>

                <form action={recordPilotDecision} className="flex items-end gap-1.5">
                  <input type="hidden" name="pilot_id" value={p.id} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">Decision</label>
                    <select
                      name="decision"
                      required
                      defaultValue=""
                      disabled={p.customer_count < MIN_CUSTOMERS_FOR_DECISION}
                      className="rounded-md border border-border bg-background p-1.5 text-xs disabled:opacity-40"
                    >
                      <option value="" disabled>
                        Select...
                      </option>
                      {Object.entries(PILOT_DECISION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    disabled={p.customer_count < MIN_CUSTOMERS_FOR_DECISION}
                    title={
                      p.customer_count < MIN_CUSTOMERS_FOR_DECISION
                        ? `Requires ${MIN_CUSTOMERS_FOR_DECISION}+ paying customers`
                        : undefined
                    }
                    className="rounded border border-border px-2 py-1 text-xs hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Record decision
                  </button>
                </form>
                {p.customer_count < MIN_CUSTOMERS_FOR_DECISION && (
                  <span className="text-xs text-muted">
                    Needs {MIN_CUSTOMERS_FOR_DECISION - p.customer_count} more customer
                    {MIN_CUSTOMERS_FOR_DECISION - p.customer_count === 1 ? "" : "s"} before a
                    decision can be recorded
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
