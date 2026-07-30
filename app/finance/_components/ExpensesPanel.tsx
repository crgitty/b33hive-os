import type { ExpenseRow } from "@/lib/finance/data";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { createExpense, deleteExpense, markExpensePaid } from "@/lib/finance/actions";

export function ExpensesPanel({ expenses }: { expenses: ExpenseRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted">Expenses</div>

      <form action={createExpense} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="expense_description">
            Description
          </label>
          <input
            id="expense_description"
            name="description"
            required
            className="w-40 rounded-md border border-border bg-background p-1.5 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="expense_amount">
            Amount (USD)
          </label>
          <input
            id="expense_amount"
            name="amount_dollars"
            type="number"
            step="0.01"
            required
            className="w-24 rounded-md border border-border bg-background p-1.5 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="expense_category">
            Category
          </label>
          <input
            id="expense_category"
            name="category"
            className="w-28 rounded-md border border-border bg-background p-1.5 text-xs"
          />
        </div>
        <label className="flex items-center gap-1.5 pb-1.5 text-xs text-muted">
          <input type="checkbox" name="is_recurring" /> Recurring
        </label>
        <label className="flex items-center gap-1.5 pb-1.5 text-xs text-muted">
          <input type="checkbox" name="already_paid" /> Already paid
        </label>
        <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-gold">
          Add expense
        </button>
      </form>

      {expenses.length === 0 ? (
        <div className="mt-4 text-sm text-muted">No expenses logged yet.</div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
            >
              <div>
                <div>{e.description}</div>
                <div className="text-xs text-muted">
                  {e.category ? `${e.category} — ` : ""}
                  {formatDate(e.incurred_at)}
                  {e.is_recurring ? " — recurring" : ""}
                  {e.paid_at ? "" : " — outstanding"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gold tabular-nums">{formatCents(e.amount_cents)}</span>
                {!e.paid_at && (
                  <form action={markExpensePaid.bind(null, e.id)}>
                    <button className="rounded border border-border px-2 py-1 text-xs hover:border-gold">
                      Mark paid
                    </button>
                  </form>
                )}
                <form action={deleteExpense.bind(null, e.id)}>
                  <button className="rounded border border-bad px-2 py-1 text-xs text-bad hover:bg-bad/10">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
