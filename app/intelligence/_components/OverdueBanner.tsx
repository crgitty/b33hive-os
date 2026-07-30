import type { PilotRow } from "@/lib/intelligence/data";

export function OverdueBanner({ pilots }: { pilots: PilotRow[] }) {
  const overdue = pilots.filter((p) => p.isOverdue);
  if (overdue.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-bad bg-bad/10 p-4">
      <div className="text-sm font-medium text-bad">
        {overdue.length} pilot decision{overdue.length === 1 ? "" : "s"} overdue — decide
        now
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {overdue.map((p) => (
          <li key={p.id} className="text-sm">
            <span className="font-medium">{p.problem_description}</span>{" "}
            <span className="text-bad">
              — {Math.abs(p.daysRemaining ?? 0)} days past the 90-day decision clock
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
