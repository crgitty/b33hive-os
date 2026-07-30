import { getFinanceData, getProjectOptionsForFinance } from "@/lib/finance/data";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { StatTile, knownMetric } from "@/app/_components/StatTile";
import { CashSnapshotForm } from "@/app/finance/_components/CashSnapshotForm";
import { ReceivablesPanel } from "@/app/finance/_components/ReceivablesPanel";
import { FollowUpQueue } from "@/app/finance/_components/FollowUpQueue";
import { MarginPanel } from "@/app/finance/_components/MarginPanel";
import { InvoicesPanel } from "@/app/finance/_components/InvoicesPanel";
import { ExpensesPanel } from "@/app/finance/_components/ExpensesPanel";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [data, projectOptions] = await Promise.all([
    getFinanceData(),
    getProjectOptionsForFinance(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <div className="text-sm text-muted">B33HIVE OS</div>
        <h1 className="text-2xl font-medium">Finance</h1>
        <div className="text-sm text-muted">Weekly cash report</div>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="text-sm text-muted">Log a cash balance</div>
        <div className="mt-1 text-xs text-muted">
          Manual entry — a real bank balance reflects things invoices and expenses alone
          cannot capture, so this is entered by hand rather than computed.
        </div>
        <div className="mt-3">
          <CashSnapshotForm />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          label="Receivables"
          metric={knownMetric(data.receivables.totalCents)}
          format={formatCents}
          sublabel="Unpaid, non-void invoices"
        />
        <StatTile
          label="Payables"
          metric={knownMetric(data.payablesCents)}
          format={formatCents}
          sublabel="Unpaid expenses"
        />
        <StatTile
          label="MRR"
          metric={knownMetric(data.mrrCents)}
          format={formatCents}
          sublabel="Active recurring projects"
        />
      </section>

      <ReceivablesPanel receivables={data.receivables} />
      <FollowUpQueue followUps={data.followUps} />
      <MarginPanel margins={data.margins} />
      <InvoicesPanel invoices={data.invoices} projectOptions={projectOptions} />
      <ExpensesPanel expenses={data.expenses} />
    </main>
  );
}
