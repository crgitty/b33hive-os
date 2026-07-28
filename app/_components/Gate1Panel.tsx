import type { GateCondition, GateStatus } from "@/lib/overview/data";

const STATUS_LABEL: Record<GateStatus, string> = {
  pass: "Clear",
  fail: "Not clear",
  not_started: "Not started",
};

const STATUS_DOT: Record<GateStatus, string> = {
  pass: "bg-good",
  fail: "bg-bad",
  not_started: "bg-muted",
};

export function Gate1Panel({ conditions }: { conditions: GateCondition[] }) {
  const allClear = conditions.every((c) => c.status === "pass");

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm text-muted">Gate 1</div>
        <div className="text-xs text-muted">
          {allClear ? "All conditions clear" : "Venture activity not yet authorized"}
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {conditions.map((c) => (
          <li
            key={c.label}
            className="flex items-start gap-3 rounded-md border border-border p-3"
          >
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[c.status]}`}
              aria-hidden
            />
            <div>
              <div className="text-sm">{c.label}</div>
              <div className="text-xs text-muted">
                {STATUS_LABEL[c.status]} — {c.detail}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
