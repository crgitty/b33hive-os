import type { ReceivablesSummary } from "@/lib/finance/data";
import { formatCents } from "@/lib/money";

export function ReceivablesPanel({ receivables }: { receivables: ReceivablesSummary }) {
  const buckets: { label: string; cents: number }[] = [
    { label: "Not yet due", cents: receivables.currentCents },
    { label: "0–30 days overdue", cents: receivables.bucket0to30Cents },
    { label: "31–60 days overdue", cents: receivables.bucket31to60Cents },
    { label: "61+ days overdue", cents: receivables.bucket61PlusCents },
  ];
  if (receivables.noDueDateCents > 0) {
    buckets.push({ label: "No due date set", cents: receivables.noDueDateCents });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted">Receivables aging</div>
      {receivables.totalCents === 0 ? (
        <div className="mt-3 text-sm text-muted">No outstanding receivables.</div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {buckets.map((b) => (
            <div key={b.label} className="rounded-md border border-border p-3">
              <div className="text-xs text-muted">{b.label}</div>
              <div className="mt-1 text-sm text-gold tabular-nums">
                {formatCents(b.cents)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
