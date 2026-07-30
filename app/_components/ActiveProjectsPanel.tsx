import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects/data";

const ROWS: ProjectStatus[] = ["active", "on_hold", "complete", "cancelled"];

export function ActiveProjectsPanel({
  activeCount,
  statusCounts,
}: {
  activeCount: number;
  statusCounts: Record<ProjectStatus, number>;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted">Active projects</span>
        <span className="text-[24px] font-medium tabular-nums text-foreground">
          {activeCount}
        </span>
      </div>
      <div className="mt-1.5 flex flex-col">
        {ROWS.map((status, i) => (
          <div
            key={status}
            className={`flex items-center justify-between py-2 text-xs ${i > 0 ? "border-t border-border" : ""}`}
          >
            <span>{PROJECT_STATUS_LABELS[status]}</span>
            <span className="tabular-nums text-foreground">{statusCounts[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
