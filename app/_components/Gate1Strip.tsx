import type { GateCondition } from "@/lib/overview/data";

export function Gate1Strip({ conditions }: { conditions: GateCondition[] }) {
  const clearedCount = conditions.filter((c) => c.status === "pass").length;

  return (
    <div className="rounded-lg border border-border bg-surface p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted">Gate 1 tracker</span>
        <span className="text-xs text-muted">
          {clearedCount} of {conditions.length} cleared
        </span>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {conditions.map((c) => (
          <div
            key={c.label}
            title={`${c.label}: ${c.detail}`}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"
          >
            <div
              className={`h-full rounded-full ${c.status === "pass" ? "w-full bg-gold" : "w-0"}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs leading-snug text-muted">
        {conditions.map((c) => c.label).join(" · ")}
      </div>
    </div>
  );
}
