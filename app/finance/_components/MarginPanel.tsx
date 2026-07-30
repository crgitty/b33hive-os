import Link from "next/link";
import type { MarginRow } from "@/lib/finance/data";
import { formatCents, formatPercent } from "@/lib/money";

export function MarginPanel({ margins }: { margins: MarginRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm text-muted">Margin per project</div>
        <div className="text-xs text-muted">
          Estimated from offer price/hours — flags &gt;15pts under target
        </div>
      </div>
      {margins.length === 0 ? (
        <div className="mt-3 text-sm text-muted">No active projects to compute margin for.</div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {margins.map((m) => (
            <li
              key={m.project_id}
              className={`flex items-center justify-between rounded-md border p-3 text-sm ${
                m.flagged ? "border-bad" : "border-border"
              }`}
            >
              <div>
                <Link href={`/projects/${m.project_id}`} className="hover:underline">
                  {m.contact_name}
                </Link>
                <div className="text-xs text-muted">{m.offer_name}</div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted">{m.hours_logged.toFixed(1)} hrs</span>
                <span className="text-muted">
                  value {formatCents(m.project_value_cents)}
                </span>
                <span className={m.flagged ? "text-bad" : "text-good"}>
                  {m.actual_margin !== null
                    ? `${formatPercent(m.actual_margin)} actual`
                    : "—"}{" "}
                  vs {formatPercent(m.target_margin)} target
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
