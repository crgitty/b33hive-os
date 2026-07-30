import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Metric } from "@/lib/overview/data";
import {
  computeWeeksRunway,
  getLatestCashSnapshot,
  getMRRCents,
  getTrailing90ExpensesCents,
} from "@/lib/finance/shared";

function unwrapOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

// --- Receivables aging ------------------------------------------------------

export interface ReceivablesSummary {
  currentCents: number;
  bucket0to30Cents: number;
  bucket31to60Cents: number;
  bucket61PlusCents: number;
  noDueDateCents: number;
  totalCents: number;
}

export interface FollowUpInvoice {
  id: string;
  project_id: string;
  contact_name: string;
  amount_cents: number;
  due_at: string;
  days_overdue: number;
  escalation: "day16" | "day21" | "day30";
}

async function getReceivablesAndFollowUps(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<{ receivables: ReceivablesSummary; followUps: FollowUpInvoice[] }> {
  const { data: unpaid } = await supabase
    .from("invoices")
    .select("id, project_id, amount_cents, due_at, status, projects(contact_id, contacts(name))")
    .is("paid_at", null)
    .not("status", "eq", "void");

  const receivables: ReceivablesSummary = {
    currentCents: 0,
    bucket0to30Cents: 0,
    bucket31to60Cents: 0,
    bucket61PlusCents: 0,
    noDueDateCents: 0,
    totalCents: 0,
  };
  const followUps: FollowUpInvoice[] = [];

  const now = Date.now();
  for (const inv of unpaid ?? []) {
    receivables.totalCents += inv.amount_cents;

    if (!inv.due_at) {
      receivables.noDueDateCents += inv.amount_cents;
      continue;
    }

    const daysOverdue = Math.floor((now - new Date(inv.due_at).getTime()) / 86_400_000);

    if (daysOverdue < 0) {
      receivables.currentCents += inv.amount_cents;
    } else if (daysOverdue <= 30) {
      receivables.bucket0to30Cents += inv.amount_cents;
    } else if (daysOverdue <= 60) {
      receivables.bucket31to60Cents += inv.amount_cents;
    } else {
      receivables.bucket61PlusCents += inv.amount_cents;
    }

    if (daysOverdue >= 16) {
      const project = unwrapOne(inv.projects as unknown) as {
        contact_id: string;
        contacts: unknown;
      } | null;
      const contact = project ? (unwrapOne(project.contacts as unknown) as { name: string } | null) : null;

      followUps.push({
        id: inv.id,
        project_id: inv.project_id,
        contact_name: contact?.name ?? "Unknown",
        amount_cents: inv.amount_cents,
        due_at: inv.due_at,
        days_overdue: daysOverdue,
        escalation: daysOverdue >= 30 ? "day30" : daysOverdue >= 21 ? "day21" : "day16",
      });
    }
  }

  followUps.sort((a, b) => b.days_overdue - a.days_overdue);

  return { receivables, followUps };
}

// --- Payables ----------------------------------------------------------------

async function getPayablesCents(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<number> {
  const { data } = await supabase.from("expenses").select("amount_cents").is("paid_at", null);
  return (data ?? []).reduce((sum, e) => sum + e.amount_cents, 0);
}

// --- Margin per project (grouped by offer), flagged >15pts under target ------

export interface MarginRow {
  project_id: string;
  contact_name: string;
  offer_name: string;
  target_margin: number;
  actual_margin: number | null;
  hours_logged: number;
  project_value_cents: number;
  flagged: boolean;
}

async function getMarginRows(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<MarginRow[]> {
  const [{ data: projects }, { data: timeEntries }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, status, started_at, contacts(name), offers(name, target_margin, price_min_cents, price_max_cents, est_hours_min, est_hours_max, is_recurring), deals(value_cents)",
      )
      .in("status", ["active", "on_hold", "complete"]),
    supabase.from("time_entries").select("project_id, entry_date, hours").not("project_id", "is", null),
  ]);

  // Toggl entries can predate a project's started_at by months — real client work
  // logged before the deal was formally marked Won in this app. Counting that against
  // a single month (or the one-time price) of contract value is what produces
  // nonsensical margin figures, so only hours logged since the project actually
  // started count here.
  const entriesByProject = new Map<string, { entry_date: string; hours: number }[]>();
  for (const e of timeEntries ?? []) {
    if (!e.project_id) continue;
    if (!entriesByProject.has(e.project_id)) entriesByProject.set(e.project_id, []);
    entriesByProject.get(e.project_id)!.push(e);
  }

  const rows: MarginRow[] = [];

  for (const p of projects ?? []) {
    const contact = unwrapOne(p.contacts as unknown) as { name: string } | null;
    const offer = unwrapOne(p.offers as unknown) as {
      name: string;
      target_margin: number;
      price_min_cents: number;
      price_max_cents: number;
      est_hours_min: number;
      est_hours_max: number;
      is_recurring: boolean;
    } | null;
    const deal = unwrapOne(p.deals as unknown) as { value_cents: number } | null;

    if (!offer || !deal) continue;

    const startedAtDate = p.started_at.slice(0, 10);
    const hoursLogged = (entriesByProject.get(p.id) ?? [])
      .filter((e) => e.entry_date >= startedAtDate)
      .reduce((sum, e) => sum + e.hours, 0);

    // No hourly cost rate is stored anywhere in the schema. The offer's own price and
    // hour ranges are the only basis available, so the implied rate is derived from
    // their midpoints — an estimate, not a booked labor cost. Recurring offers price
    // and estimate hours per month, so the rate itself needs no special-casing; only
    // the total contract value does, scaled by months elapsed.
    const avgPriceCents = (offer.price_min_cents + offer.price_max_cents) / 2;
    const avgHours = (offer.est_hours_min + offer.est_hours_max) / 2;
    const impliedHourlyRateCents = avgHours > 0 ? avgPriceCents / avgHours : 0;

    let projectValueCents = deal.value_cents;
    if (offer.is_recurring) {
      const monthsElapsed = Math.max(
        1,
        Math.round(
          (Date.now() - new Date(p.started_at).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
        ),
      );
      projectValueCents = deal.value_cents * monthsElapsed;
    }

    const actualCostCents = hoursLogged * impliedHourlyRateCents;
    const actualMargin =
      projectValueCents > 0 ? (projectValueCents - actualCostCents) / projectValueCents : null;

    rows.push({
      project_id: p.id,
      contact_name: contact?.name ?? "Unknown",
      offer_name: offer.name,
      target_margin: offer.target_margin,
      actual_margin: actualMargin,
      hours_logged: hoursLogged,
      project_value_cents: projectValueCents,
      flagged: actualMargin !== null && offer.target_margin - actualMargin > 0.15,
    });
  }

  return rows;
}

// --- Manual entry lists --------------------------------------------------------

export interface InvoiceRow {
  id: string;
  project_id: string;
  contact_name: string;
  amount_cents: number;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  status: "draft" | "sent" | "paid" | "void";
}

async function getInvoices(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<InvoiceRow[]> {
  const { data } = await supabase
    .from("invoices")
    .select("id, project_id, amount_cents, issued_at, due_at, paid_at, status, projects(contacts(name))")
    .order("issued_at", { ascending: false, nullsFirst: false });

  return (data ?? []).map((i) => {
    const project = unwrapOne(i.projects as unknown) as { contacts: unknown } | null;
    const contact = project ? (unwrapOne(project.contacts as unknown) as { name: string } | null) : null;
    return { ...i, contact_name: contact?.name ?? "Unknown" };
  });
}

export interface ExpenseRow {
  id: string;
  description: string;
  amount_cents: number;
  category: string | null;
  incurred_at: string;
  is_recurring: boolean;
  paid_at: string | null;
}

async function getExpenses(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<ExpenseRow[]> {
  const { data } = await supabase
    .from("expenses")
    .select("id, description, amount_cents, category, incurred_at, is_recurring, paid_at")
    .order("incurred_at", { ascending: false });
  return data ?? [];
}

// --- Top-level assembly --------------------------------------------------------

export interface FinanceData {
  cashOnHandCents: Metric;
  cashAsOf: string | null;
  weeksRunway: Metric;
  mrrCents: number;
  receivables: ReceivablesSummary;
  payablesCents: number;
  followUps: FollowUpInvoice[];
  margins: MarginRow[];
  invoices: InvoiceRow[];
  expenses: ExpenseRow[];
}

export async function getFinanceData(): Promise<FinanceData> {
  const supabase = getSupabaseServerClient();

  const [
    cashSnapshot,
    expenses90Total,
    mrrCents,
    { receivables, followUps },
    payablesCents,
    margins,
    invoices,
    expenses,
  ] = await Promise.all([
    getLatestCashSnapshot(supabase),
    getTrailing90ExpensesCents(supabase),
    getMRRCents(supabase),
    getReceivablesAndFollowUps(supabase),
    getPayablesCents(supabase),
    getMarginRows(supabase),
    getInvoices(supabase),
    getExpenses(supabase),
  ]);

  return {
    cashOnHandCents: cashSnapshot
      ? { known: true, value: cashSnapshot.balanceCents }
      : { known: false, reason: "No cash snapshot logged yet" },
    cashAsOf: cashSnapshot?.asOf ?? null,
    weeksRunway: computeWeeksRunway(cashSnapshot?.balanceCents ?? null, expenses90Total),
    mrrCents,
    receivables,
    payablesCents,
    followUps,
    margins,
    invoices,
    expenses,
  };
}

export interface ProjectOption {
  id: string;
  label: string;
}

export async function getProjectOptionsForFinance(): Promise<ProjectOption[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select("id, contacts(name), offers(name)")
    .order("started_at", { ascending: false });

  return (data ?? []).map((p) => {
    const contact = unwrapOne(p.contacts as unknown) as { name: string } | null;
    const offer = unwrapOne(p.offers as unknown) as { name: string } | null;
    return { id: p.id, label: `${contact?.name ?? "Unknown"} — ${offer?.name ?? "Unknown"}` };
  });
}
