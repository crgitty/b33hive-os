import { STAGE_LABELS, STAGE_ORDER, type DealStage } from "@/lib/overview/data";

export function StageRow({ counts }: { counts: Record<DealStage, number> }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted">Pipeline stages</div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STAGE_ORDER.map((stage) => (
          <div key={stage} className="rounded-md border border-border p-3">
            <div className="text-xs text-muted">{STAGE_LABELS[stage]}</div>
            <div className="mt-1 text-lg font-medium tabular-nums">
              {counts[stage]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
