import { getOverviewData } from "@/lib/overview/data";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { StatTile, knownMetric } from "@/app/_components/StatTile";
import { StageRow } from "@/app/_components/StageRow";
import { Gate1Panel } from "@/app/_components/Gate1Panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getOverviewData();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <div className="text-sm text-muted">B33HIVE OS</div>
        <h1 className="text-2xl font-medium">Overview</h1>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Cash on hand"
          metric={data.cashOnHandCents}
          format={formatCents}
          sublabel={data.cashAsOf ? `As of ${formatDate(data.cashAsOf)}` : undefined}
        />
        <StatTile
          label="Weeks runway"
          metric={data.weeksRunway}
          format={(v) => Math.round(v).toString()}
          sublabel="At trailing 90-day burn"
        />
        <StatTile
          label="Pipeline value"
          metric={knownMetric(data.pipelineValueCents)}
          format={formatCents}
          sublabel="Open deals, excludes Won/Lost"
        />
        <StatTile
          label="MRR"
          metric={knownMetric(data.mrrCents)}
          format={formatCents}
          sublabel="Active recurring projects"
        />
      </section>

      <StageRow counts={data.stageCounts} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active projects"
          metric={knownMetric(data.activeProjects)}
          format={(v) => v.toString()}
        />
        <StatTile
          label="Hours this week"
          metric={knownMetric(data.hoursThisWeek)}
          format={(v) => v.toFixed(1)}
          sublabel="Toggl mirror, not yet connected"
        />
        <StatTile
          label="Receivables 30+"
          metric={knownMetric(data.receivables30PlusCents)}
          format={formatCents}
          sublabel="Unpaid, issued 30+ days ago"
        />
        <StatTile
          label="Problems logged"
          metric={knownMetric(data.problemsTotal)}
          format={(v) => v.toString()}
          sublabel={`${data.problemsFlagged} flagged (score ≥ 12)`}
        />
      </section>

      <Gate1Panel conditions={data.gate1} />
    </main>
  );
}
