import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealForEdit, getOfferOptions } from "@/lib/pipeline/data";
import { updateDeal } from "@/lib/pipeline/actions";

export const dynamic = "force-dynamic";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [deal, offers] = await Promise.all([getDealForEdit(id), getOfferOptions()]);
  if (!deal) notFound();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <div className="text-sm text-muted">
          <Link href="/pipeline" className="hover:underline">
            Pipeline
          </Link>{" "}
          / Edit deal
        </div>
        <h1 className="text-2xl font-medium">Edit deal</h1>
      </header>

      <form action={updateDeal} className="flex flex-col gap-5">
        <input type="hidden" name="deal_id" value={deal.id} />
        <input type="hidden" name="contact_id" value={deal.contact_id} />

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-col gap-3">
            <Field label="Name" name="contact_name" defaultValue={deal.contact_name} />
            <Field label="Organization" name="contact_org" defaultValue={deal.contact_org} />
            <Field
              label="Email"
              name="contact_email"
              type="email"
              defaultValue={deal.contact_email}
            />
            <Field
              label="Phone"
              name="contact_phone"
              type="tel"
              defaultValue={deal.contact_phone}
            />
            <Field label="Source" name="contact_source" defaultValue={deal.contact_source} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <label className="text-sm text-muted" htmlFor="offer_type">
            Offer
          </label>
          <select
            id="offer_type"
            name="offer_type"
            required
            defaultValue={deal.offer_type}
            className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
          >
            {offers.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>

          <div className="mt-3">
            <Field
              label="Value (USD, monthly for recurring offers)"
              name="value_dollars"
              type="number"
              defaultValue={(deal.value_cents / 100).toString()}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-gold px-4 py-2 text-sm text-background"
          >
            Save
          </button>
          <Link
            href="/pipeline"
            className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label className="text-xs text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
      />
    </div>
  );
}
