import Link from "next/link";
import { notFound } from "next/navigation";
import { getContactDetail } from "@/lib/pipeline/data";
import { logActivity } from "@/lib/pipeline/actions";
import { formatCents } from "@/lib/money";
import { formatDateTime, nowLocalInputValue } from "@/lib/dates";
import { STAGE_LABELS } from "@/lib/overview/data";

export const dynamic = "force-dynamic";

const ACTIVITY_TYPES = ["call", "email", "meeting", "proposal", "note"] as const;

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContactDetail(id);
  if (!contact) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <div className="text-sm text-muted">
          <Link href="/pipeline" className="hover:underline">
            Pipeline
          </Link>{" "}
          / {contact.name}
        </div>
        <h1 className="text-2xl font-medium">{contact.name}</h1>
        {contact.org && <div className="text-sm text-muted">{contact.org}</div>}
      </header>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Detail label="Role" value={contact.role} />
          <Detail label="Email" value={contact.email} />
          <Detail label="Phone" value={contact.phone} />
          <Detail label="Source" value={contact.source} />
          <Detail label="Segment" value={contact.segment} />
          <Detail
            label="Last contact"
            value={contact.last_contact_at ? formatDateTime(contact.last_contact_at) : null}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="text-sm text-muted">Deals</div>
        <div className="mt-3 flex flex-col gap-2">
          {contact.deals.length === 0 && (
            <div className="text-xs text-muted">No deals yet</div>
          )}
          {contact.deals.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
            >
              <span>{STAGE_LABELS[d.stage]}</span>
              <span className="text-gold tabular-nums">{formatCents(d.value_cents)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="text-sm text-muted">Log activity</div>
        <form action={logActivity} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="contact_id" value={contact.id} />
          <div className="flex gap-3">
            <select
              name="type"
              defaultValue="note"
              className="rounded-md border border-border bg-background p-2 text-sm"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <select
              name="deal_id"
              defaultValue=""
              className="flex-1 rounded-md border border-border bg-background p-2 text-sm"
            >
              <option value="">General (no deal)</option>
              {contact.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {STAGE_LABELS[d.stage]} deal — {formatCents(d.value_cents)}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              name="occurred_at"
              defaultValue={nowLocalInputValue()}
              className="rounded-md border border-border bg-background p-2 text-sm"
            />
          </div>
          <textarea
            name="note"
            rows={2}
            placeholder="Note"
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
          />
          <button
            type="submit"
            className="self-start rounded-md bg-gold px-3 py-1.5 text-sm text-background"
          >
            Log activity
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="text-sm text-muted">Timeline</div>
        <ul className="mt-3 flex flex-col gap-2">
          {contact.activities.length === 0 && (
            <li className="text-xs text-muted">No activity logged yet</li>
          )}
          {contact.activities.map((a) => (
            <li key={a.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="capitalize text-gold">{a.type}</span>
                <span className="text-xs text-muted">{formatDateTime(a.occurred_at)}</span>
              </div>
              {a.note && <div className="mt-1 text-muted">{a.note}</div>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}
