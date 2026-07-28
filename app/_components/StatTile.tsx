import type { Metric } from "@/lib/overview/data";

export function StatTile({
  label,
  metric,
  format,
  sublabel,
}: {
  label: string;
  metric: Metric;
  format: (value: number) => string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-medium text-gold tabular-nums">
        {metric.known ? format(metric.value) : "—"}
      </div>
      <div className="mt-1 text-xs text-muted">
        {metric.known ? sublabel : metric.reason}
      </div>
    </div>
  );
}

export function knownMetric(value: number): Metric {
  return { known: true, value };
}
