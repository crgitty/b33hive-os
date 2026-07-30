import { logCashSnapshot } from "@/lib/finance/actions";

export function CashSnapshotForm() {
  return (
    <form action={logCashSnapshot} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted" htmlFor="balance_dollars">
          Cash balance (USD)
        </label>
        <input
          id="balance_dollars"
          name="balance_dollars"
          type="number"
          step="0.01"
          required
          className="w-32 rounded-md border border-border bg-background p-1.5 text-xs"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted" htmlFor="cash_note">
          Note
        </label>
        <input
          id="cash_note"
          name="note"
          placeholder="e.g. checking balance"
          className="w-40 rounded-md border border-border bg-background p-1.5 text-xs"
        />
      </div>
      <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-gold">
        Log balance
      </button>
    </form>
  );
}
