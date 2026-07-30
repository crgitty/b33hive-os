import { STAGE_LABELS, type DealStage } from "@/lib/overview/data";

const ROWS: DealStage[] = ["contacted", "qualified", "proposal_sent", "negotiation"];

export function PipelineSnapshot({
  counts,
  staleCount,
}: {
  counts: Record<DealStage, number>;
  staleCount: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3.5">
      <div className="text-xs text-muted">Pipeline snapshot</div>
      <div className="mt-1.5 flex flex-col">
        {ROWS.map((stage, i) => (
          <div
            key={stage}
            className={`flex items-center justify-between py-2 text-xs ${i > 0 ? "border-t border-border" : ""}`}
          >
            <span>{STAGE_LABELS[stage]}</span>
            <span className="tabular-nums text-foreground">{counts[stage]}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border py-2 text-xs">
          <span className={staleCount > 0 ? "text-bad" : ""}>Stale &gt; 14 days</span>
          <span
            className={`tabular-nums ${staleCount > 0 ? "font-medium text-bad" : "text-foreground"}`}
          >
            {staleCount}
          </span>
        </div>
      </div>
    </div>
  );
}
