import Link from "next/link";
import { getContactOptions, getOfferOptions } from "@/lib/pipeline/data";
import { createDeal } from "@/lib/pipeline/actions";

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  const [contacts, offers] = await Promise.all([
    getContactOptions(),
    getOfferOptions(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <div className="text-sm text-muted">
          <Link href="/pipeline" className="hover:underline">
            Pipeline
          </Link>{" "}
          / New deal
        </div>
        <h1 className="text-2xl font-medium">Add deal</h1>
      </header>

      <form action={createDeal} className="flex flex-col gap-5">
        <div className="rounded-lg border border-border bg-surface p-4">
          <label className="text-sm text-muted" htmlFor="contact_id">
            Existing contact
          </label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
          >
            <option value="">— New contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.org ? ` (${c.org})` : ""}
              </option>
            ))}
          </select>

          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-muted">
              Fields below are only used when no existing contact is selected.
            </p>
            <Field label="Name" name="new_contact_name" />
            <Field label="Organization" name="new_contact_org" />
            <Field label="Email" name="new_contact_email" type="email" />
            <Field label="Phone" name="new_contact_phone" type="tel" />
            <Field label="Source" name="new_contact_source" />
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
            defaultValue=""
            className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
          >
            <option value="" disabled>
              Select an offer
            </option>
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
            />
          </div>
        </div>

        <button
          type="submit"
          className="self-start rounded-md bg-gold px-4 py-2 text-sm text-background"
        >
          Add deal
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
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
        className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
      />
    </div>
  );
}
