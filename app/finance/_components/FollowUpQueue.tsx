import Link from "next/link";
import type { FollowUpInvoice } from "@/lib/finance/data";
import { formatCents } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";

const ESCALATION_LABEL: Record<FollowUpInvoice["escalation"], string> = {
  day16: "Day 16",
  day21: "Day 21",
  day30: "Day 30+",
};

const ESCALATION_CLASS: Record<FollowUpInvoice["escalation"], string> = {
  day16: "text-muted",
  day21: "text-gold",
  day30: "text-bad",
};

export function FollowUpQueue({ followUps }: { followUps: FollowUpInvoice[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted">Receivables follow-up queue</div>
      {followUps.length === 0 ? (
        <div className="mt-3 text-sm text-muted">
          Nothing overdue by 16+ days. Nothing to chase.
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {followUps.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
            >
              <Link href={`/projects/${f.project_id}`} className="hover:underline">
                {f.contact_name}
              </Link>
              <div className="flex items-center gap-4">
                <span className="text-gold tabular-nums">{formatCents(f.amount_cents)}</span>
                <span className="text-xs text-muted">Due {formatDateOnly(f.due_at)}</span>
                <span className={`text-xs ${ESCALATION_CLASS[f.escalation]}`}>
                  {ESCALATION_LABEL[f.escalation]} — {f.days_overdue}d overdue
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
