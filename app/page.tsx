import { getOverviewData } from "@/lib/overview/data";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { StatTile, knownMetric } from "@/app/_components/StatTile";
import { PipelineSnapshot } from "@/app/_components/PipelineSnapshot";
import { ActiveProjectsPanel } from "@/app/_components/ActiveProjectsPanel";
import { Gate1Strip } from "@/app/_components/Gate1Strip";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getOverviewData();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-5">
      <header>
        <h1 className="text-base font-medium">Overview</h1>
      </header>

      <section className="grid grid-cols-4 gap-4">
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
          sublabel="Trailing 90-day burn"
        />
        <StatTile
          label="Pipeline value"
          metric={knownMetric(data.pipelineValueCents)}
          format={formatCents}
          sublabel="Open deals"
        />
        <StatTile
          label="MRR"
          metric={knownMetric(data.mrrCents)}
          format={formatCents}
          sublabel="Active recurring"
        />
      </section>

      <section className="grid grid-cols-[1.15fr_1fr] gap-4">
        <PipelineSnapshot counts={data.stageCounts} staleCount={data.staleDealsCount} />
        <ActiveProjectsPanel
          activeCount={data.activeProjects}
          statusCounts={data.projectStatusCounts}
        />
      </section>

      <section className="grid grid-cols-3 gap-4">
        <StatTile
          label="Hours this week"
          metric={knownMetric(data.hoursThisWeek)}
          format={(v) => v.toFixed(1)}
        />
        <StatTile
          label="Receivables"
          metric={knownMetric(data.receivables30PlusCents)}
          format={formatCents}
        />
        <StatTile
          label="Problems logged"
          metric={knownMetric(data.problemsTotal)}
          format={(v) => v.toString()}
          sublabel={`${data.problemsFlagged} flagged`}
        />
      </section>

      <Gate1Strip conditions={data.gate1} />
    </main>
  );
}
