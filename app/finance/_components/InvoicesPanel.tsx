import type { InvoiceRow, ProjectOption } from "@/lib/finance/data";
import { formatCents } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import {
  createInvoice,
  deleteInvoice,
  markInvoicePaid,
  markInvoiceSent,
  voidInvoice,
} from "@/lib/finance/actions";

const STATUS_LABEL: Record<InvoiceRow["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
};

export function InvoicesPanel({
  invoices,
  projectOptions,
}: {
  invoices: InvoiceRow[];
  projectOptions: ProjectOption[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted">Invoices</div>

      <form action={createInvoice} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="invoice_project_id">
            Project
          </label>
          <select
            id="invoice_project_id"
            name="project_id"
            required
            defaultValue=""
            className="rounded-md border border-border bg-background p-1.5 text-xs"
          >
            <option value="" disabled>
              Select project
            </option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="invoice_amount">
            Amount (USD)
          </label>
          <input
            id="invoice_amount"
            name="amount_dollars"
            type="number"
            step="0.01"
            required
            className="w-28 rounded-md border border-border bg-background p-1.5 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="invoice_due_at">
            Due date
          </label>
          <input
            id="invoice_due_at"
            name="due_at"
            type="date"
            className="rounded-md border border-border bg-background p-1.5 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="invoice_issued_at">
            Issued date (backdating)
          </label>
          <input
            id="invoice_issued_at"
            name="issued_at"
            type="date"
            className="rounded-md border border-border bg-background p-1.5 text-xs"
          />
        </div>
        <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-gold">
          Add invoice
        </button>
      </form>

      {invoices.length === 0 ? (
        <div className="mt-4 text-sm text-muted">No invoices logged yet.</div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
            >
              <div>
                <div>{inv.contact_name}</div>
                <div className="text-xs text-muted">
                  {STATUS_LABEL[inv.status]}
                  {inv.due_at ? ` — due ${formatDateOnly(inv.due_at)}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gold tabular-nums">{formatCents(inv.amount_cents)}</span>
                {inv.status === "draft" && (
                  <form action={markInvoiceSent.bind(null, inv.id)}>
                    <button className="rounded border border-border px-2 py-1 text-xs hover:border-gold">
                      Mark sent
                    </button>
                  </form>
                )}
                {(inv.status === "draft" || inv.status === "sent") && (
                  <form action={markInvoicePaid.bind(null, inv.id)}>
                    <button className="rounded border border-border px-2 py-1 text-xs hover:border-gold">
                      Mark paid
                    </button>
                  </form>
                )}
                {inv.status !== "void" && inv.status !== "paid" && (
                  <form action={voidInvoice.bind(null, inv.id)}>
                    <button className="rounded border border-border px-2 py-1 text-xs text-muted hover:border-gold">
                      Void
                    </button>
                  </form>
                )}
                <form action={deleteInvoice.bind(null, inv.id)}>
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
