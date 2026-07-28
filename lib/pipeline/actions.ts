"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DealStage } from "@/lib/overview/data";

function dollarsToCents(input: FormDataEntryValue | null): number {
  const dollars = parseFloat(String(input ?? "0"));
  return Math.round((Number.isFinite(dollars) ? dollars : 0) * 100);
}

export async function createDeal(formData: FormData) {
  const supabase = getSupabaseServerClient();

  let contactId = String(formData.get("contact_id") ?? "");

  if (!contactId) {
    const name = String(formData.get("new_contact_name") ?? "").trim();
    if (!name) {
      throw new Error("A contact name is required to create a new contact.");
    }
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        name,
        org: String(formData.get("new_contact_org") ?? "").trim() || null,
        email: String(formData.get("new_contact_email") ?? "").trim() || null,
        phone: String(formData.get("new_contact_phone") ?? "").trim() || null,
        source: String(formData.get("new_contact_source") ?? "").trim() || null,
      })
      .select("id")
      .single();
    if (contactError) throw new Error(contactError.message);
    contactId = contact.id;
  }

  const { error: dealError } = await supabase.from("deals").insert({
    contact_id: contactId,
    offer_type: String(formData.get("offer_type") ?? ""),
    value_cents: dollarsToCents(formData.get("value_dollars")),
  });
  if (dealError) throw new Error(dealError.message);

  revalidatePath("/pipeline");
  redirect("/pipeline");
}

export async function updateDeal(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const dealId = String(formData.get("deal_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "");

  const { error: contactError } = await supabase
    .from("contacts")
    .update({
      name: String(formData.get("contact_name") ?? "").trim(),
      org: String(formData.get("contact_org") ?? "").trim() || null,
      email: String(formData.get("contact_email") ?? "").trim() || null,
      phone: String(formData.get("contact_phone") ?? "").trim() || null,
      source: String(formData.get("contact_source") ?? "").trim() || null,
    })
    .eq("id", contactId);
  if (contactError) throw new Error(contactError.message);

  const { error: dealError } = await supabase
    .from("deals")
    .update({
      offer_type: String(formData.get("offer_type") ?? ""),
      value_cents: dollarsToCents(formData.get("value_dollars")),
    })
    .eq("id", dealId);
  if (dealError) throw new Error(dealError.message);

  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/contacts/${contactId}`);
  redirect("/pipeline");
}

export async function deleteDeals(dealIds: string[]) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("deals").delete().in("id", dealIds);
  if (error) throw new Error(error.message);

  revalidatePath("/pipeline");
}

export async function updateDealStage(
  dealId: string,
  stage: DealStage,
  lossReason?: string,
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("deals")
    .update({
      stage,
      loss_reason: stage === "lost" ? lossReason ?? null : null,
    })
    .eq("id", dealId);
  if (error) throw new Error(error.message);

  revalidatePath("/pipeline");
}

export async function logActivity(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const contactId = String(formData.get("contact_id") ?? "");
  const dealId = String(formData.get("deal_id") ?? "") || null;
  const type = String(formData.get("type") ?? "note");
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurredAtLocal = String(formData.get("occurred_at") ?? "");

  const { error } = await supabase.from("activities").insert({
    contact_id: contactId,
    deal_id: dealId,
    type,
    note,
    occurred_at: occurredAtLocal ? new Date(occurredAtLocal).toISOString() : new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/pipeline/contacts/${contactId}`);
  revalidatePath("/pipeline");
}
