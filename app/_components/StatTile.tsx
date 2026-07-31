import Link from "next/link";
import type { Metric } from "@/lib/overview/data";

export function StatTile({
  label,
  metric,
  format,
  sublabel,
  href,
}: {
  label: string;
  metric: Metric;
  format: (value: number) => string;
  sublabel?: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-[24px] font-medium tabular-nums text-foreground">
        {metric.known ? format(metric.value) : "—"}
      </div>
      {(metric.known ? sublabel : metric.reason) && (
        <div className="mt-1 text-xs leading-snug text-muted">
          {metric.known ? sublabel : metric.reason}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block cursor-pointer rounded-lg border border-border bg-surface p-3.5 hover:border-border-strong"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-lg border border-border bg-surface p-3.5">{content}</div>;
}

export function knownMetric(value: number): Metric {
  return { known: true, value };
}
