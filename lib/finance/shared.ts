import type { SupabaseClient } from "@supabase/supabase-js";
import { daysAgoIso } from "@/lib/dates";
import type { Metric } from "@/lib/overview/data";

// Shared by Overview and Finance so the two views can never disagree about what "cash
// on hand," "weeks runway," or "MRR" mean — same records, different lenses.

export interface CashSnapshot {
  balanceCents: number;
  asOf: string;
}

export async function getLatestCashSnapshot(
  supabase: SupabaseClient,
): Promise<CashSnapshot | null> {
  const { data } = await supabase
    .from("cash_snapshots")
    .select("balance_cents, as_of")
    .order("as_of", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? { balanceCents: data.balance_cents, asOf: data.as_of } : null;
}

export async function getTrailing90ExpensesCents(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("expenses")
    .select("amount_cents")
    .gte("incurred_at", daysAgoIso(90));

  return (data ?? []).reduce((sum, e) => sum + e.amount_cents, 0);
}

export function computeWeeksRunway(
  cashOnHandCents: number | null,
  trailing90ExpensesCents: number,
): Metric {
  const weeklyBurnCents = trailing90ExpensesCents / (90 / 7);
  if (cashOnHandCents === null || weeklyBurnCents === 0) {
    return { known: false, reason: "Not enough expense history yet" };
  }
  return { known: true, value: cashOnHandCents / weeklyBurnCents };
}

function unwrapOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/** Sum of active projects' deal value where the offer is recurring (is_recurring). */
export async function getMRRCents(supabase: SupabaseClient): Promise<number> {
  const [{ data: offers }, { data: projects }] = await Promise.all([
    supabase.from("offers").select("slug, is_recurring"),
    supabase
      .from("projects")
      .select("status, offer_type, deals(value_cents)")
      .eq("status", "active"),
  ]);

  const recurringByOffer = new Map(
    (offers ?? []).map((o) => [o.slug, o.is_recurring as boolean]),
  );

  let mrrCents = 0;
  for (const p of projects ?? []) {
    if (recurringByOffer.get(p.offer_type)) {
      const deal = unwrapOne(p.deals as unknown);
      if (deal) mrrCents += (deal as { value_cents: number }).value_cents;
    }
  }
  return mrrCents;
}
