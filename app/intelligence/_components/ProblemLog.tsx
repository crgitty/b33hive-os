import type { ProblemRow } from "@/lib/intelligence/data";
import { createProblem, deleteProblem } from "@/lib/intelligence/actions";
import { formatCents } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";

const SCORES = [1, 2, 3, 4, 5];

export function ProblemLog({ problems }: { problems: ProblemRow[] }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted">Problem log</div>

      <form action={createProblem} className="mt-3 flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Org type" name="org_type" required />
          <Field label="Current spend (USD/mo, optional)" name="current_spend_dollars" type="number" />
        </div>
        <div>
          <label className="text-xs text-muted" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={2}
            className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ScoreField label="Frequency (1–5)" name="frequency_score" />
          <ScoreField label="Pain (1–5)" name="pain_score" />
          <ScoreField
            label="Productization potential (1–5, optional)"
            name="productization_potential"
            required={false}
          />
        </div>
        <Field label="Current workaround" name="current_workaround" />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="purchasing_authority" />
          Contact has purchasing authority
        </label>
        <button
          type="submit"
          className="self-start rounded-md bg-gold px-3 py-1.5 text-sm text-background"
        >
          Log problem
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-2">
        {problems.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
            No problems logged yet.
          </div>
        )}
        {problems.map((p) => (
          <div
            key={p.id}
            className={`rounded-md border p-3 text-sm ${
              p.is_flagged ? "border-bad bg-bad/10" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {p.is_flagged && (
                    <span className="rounded bg-bad px-1.5 py-0.5 text-xs font-medium text-background">
                      Flagged
                    </span>
                  )}
                  <span className="font-medium">{p.org_type}</span>
                </div>
                <div className="mt-1 text-muted">{p.description}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                  <span>Frequency {p.frequency_score}</span>
                  <span>Pain {p.pain_score}</span>
                  {p.current_spend_cents !== null && (
                    <span>Spend {formatCents(p.current_spend_cents)}/mo</span>
                  )}
                  {p.purchasing_authority !== null && (
                    <span>{p.purchasing_authority ? "Has" : "No"} purchasing authority</span>
                  )}
                  <span>Logged {formatDateOnly(p.logged_at)}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`text-lg font-medium tabular-nums ${p.is_flagged ? "text-bad" : "text-gold"}`}
                >
                  {p.combined_score}
                </span>
                <form action={deleteProblem.bind(null, p.id)}>
                  <button className="rounded border border-bad px-2 py-1 text-xs text-bad hover:bg-bad/10">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        required={required}
        className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
      />
    </div>
  );
}

function ScoreField({
  label,
  name,
  required = true,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-muted" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
      >
        <option value="" disabled>
          Select
        </option>
        {SCORES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
