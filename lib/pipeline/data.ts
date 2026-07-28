import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STAGE_ORDER, type DealStage } from "@/lib/overview/data";

export interface PipelineDeal {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_org: string | null;
  offer_type: string;
  offer_name: string;
  value_cents: number;
  stage: DealStage;
  stage_entered_at: string;
  loss_reason: string | null;
  days_in_stage: number;
  days_silent: number | null;
  stale_reason: "silent_21d" | "contacted_14d" | "proposal_sent_10d" | null;
}

export async function getPipelineBoard(): Promise<Record<DealStage, PipelineDeal[]>> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("deals_pipeline")
    .select(
      "id, contact_id, contact_name, contact_org, offer_type, offer_name, value_cents, stage, stage_entered_at, loss_reason, days_in_stage, days_silent, stale_reason",
    )
    .order("stage_entered_at", { ascending: true });

  const board = {} as Record<DealStage, PipelineDeal[]>;
  for (const s of STAGE_ORDER) board[s] = [];
  for (const row of (data ?? []) as PipelineDeal[]) {
    board[row.stage].push(row);
  }
  return board;
}

export interface ContactOption {
  id: string;
  name: string;
  org: string | null;
}

export async function getContactOptions(): Promise<ContactOption[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, org")
    .order("name", { ascending: true });
  return data ?? [];
}

export interface OfferOption {
  slug: string;
  name: string;
  price_min_cents: number;
  price_max_cents: number;
  is_recurring: boolean;
}

export async function getOfferOptions(): Promise<OfferOption[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("offers")
    .select("slug, name, price_min_cents, price_max_cents, is_recurring")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export interface Activity {
  id: string;
  deal_id: string | null;
  type: "call" | "email" | "meeting" | "proposal" | "note";
  note: string | null;
  occurred_at: string;
}

export interface ContactDetail {
  id: string;
  name: string;
  org: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  segment: string | null;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  deals: {
    id: string;
    offer_type: string;
    value_cents: number;
    stage: DealStage;
    stage_entered_at: string;
  }[];
  activities: Activity[];
}

export async function getContactDetail(contactId: string): Promise<ContactDetail | null> {
  const supabase = getSupabaseServerClient();
  const [{ data: contact }, { data: deals }, { data: activities }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", contactId).maybeSingle(),
    supabase
      .from("deals")
      .select("id, offer_type, value_cents, stage, stage_entered_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("id, deal_id, type, note, occurred_at")
      .eq("contact_id", contactId)
      .order("occurred_at", { ascending: false }),
  ]);

  if (!contact) return null;

  return {
    ...contact,
    deals: deals ?? [],
    activities: activities ?? [],
  };
}
