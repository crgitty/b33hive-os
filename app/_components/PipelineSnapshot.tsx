import Link from "next/link";
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
    <div className="rounded-lg border border-border bg-surface p-3.5 hover:border-border-strong">
      <Link
        href="/pipeline"
        className="block cursor-pointer text-xs text-muted hover:text-foreground"
      >
        Pipeline snapshot
      </Link>
      <div className="mt-1.5 flex flex-col">
        {ROWS.map((stage, i) => (
          <Link
            key={stage}
            href={`/pipeline?stage=${stage}`}
            className={`flex cursor-pointer items-center justify-between py-2 text-xs hover:text-foreground ${i > 0 ? "border-t border-border" : ""}`}
          >
            <span>{STAGE_LABELS[stage]}</span>
            <span className="tabular-nums text-foreground">{counts[stage]}</span>
          </Link>
        ))}
        <Link
          href="/pipeline"
          className="flex cursor-pointer items-center justify-between border-t border-border py-2 text-xs hover:text-foreground"
        >
          <span className={staleCount > 0 ? "text-bad" : ""}>Stale &gt; 14 days</span>
          <span
            className={`tabular-nums ${staleCount > 0 ? "font-medium text-bad" : "text-foreground"}`}
          >
            {staleCount}
          </span>
        </Link>
      </div>
    </div>
  );
}
