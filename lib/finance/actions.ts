"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function dollarsToCents(input: FormDataEntryValue | null): number {
  const dollars = parseFloat(String(input ?? "0"));
  return Math.round((Number.isFinite(dollars) ? dollars : 0) * 100);
}

function revalidateFinance() {
  revalidatePath("/finance");
  revalidatePath("/"); // cash on hand + MRR are shared with Overview
}

// invoices_issued_before_due requires issued_at <= due_at whenever both are set. If an
// invoice is entered late with a due_at already in the past (catching up on real
// bookkeeping is normal, not an edge case), stamping issued_at with "now" at send/paid
// time would violate that constraint. Falling back to due_at instead of now whenever
// due_at has already passed keeps the constraint satisfied without inventing a fake date.
function resolveIssuedAt(existingIssuedAt: string | null, dueAt: string | null): string {
  if (existingIssuedAt) return existingIssuedAt;
  const now = new Date().toISOString();
  if (dueAt && dueAt < now) return dueAt;
  return now;
}

// --- Cash snapshot -------------------------------------------------------------

export async function logCashSnapshot(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const balanceCents = dollarsToCents(formData.get("balance_dollars"));
  const note = String(formData.get("note") ?? "").trim() || null;

  const { error } = await supabase.from("cash_snapshots").insert({
    balance_cents: balanceCents,
    note,
  });
  if (error) throw new Error(error.message);

  revalidateFinance();
}

// --- Invoices --------------------------------------------------------------

export async function createInvoice(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const projectId = String(formData.get("project_id") ?? "");
  const amountCents = dollarsToCents(formData.get("amount_dollars"));
  const dueAt = String(formData.get("due_at") ?? "") || null;
  const issuedAt = String(formData.get("issued_at") ?? "") || null;
  if (!projectId || amountCents <= 0) {
    throw new Error("A project and a positive amount are required.");
  }

  const { error } = await supabase.from("invoices").insert({
    project_id: projectId,
    amount_cents: amountCents,
    due_at: dueAt,
    issued_at: issuedAt,
    status: "draft",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
}

export async function markInvoiceSent(invoiceId: string) {
  const supabase = getSupabaseServerClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("issued_at, due_at")
    .eq("id", invoiceId)
    .maybeSingle();

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "sent",
      issued_at: resolveIssuedAt(invoice?.issued_at ?? null, invoice?.due_at ?? null),
    })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
}

export async function markInvoicePaid(invoiceId: string) {
  const supabase = getSupabaseServerClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("issued_at, due_at")
    .eq("id", invoiceId)
    .maybeSingle();

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      issued_at: resolveIssuedAt(invoice?.issued_at ?? null, invoice?.due_at ?? null),
    })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidateFinance();
}

export async function voidInvoice(invoiceId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "void", paid_at: null })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidateFinance();
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidateFinance();
}

// --- Expenses --------------------------------------------------------------

export async function createExpense(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const description = String(formData.get("description") ?? "").trim();
  const amountCents = dollarsToCents(formData.get("amount_dollars"));
  const category = String(formData.get("category") ?? "").trim() || null;
  const incurredAt = String(formData.get("incurred_at") ?? "") || new Date().toISOString();
  const isRecurring = formData.get("is_recurring") === "on";
  const alreadyPaid = formData.get("already_paid") === "on";

  if (!description || amountCents <= 0) {
    throw new Error("A description and a positive amount are required.");
  }

  const { error } = await supabase.from("expenses").insert({
    description,
    amount_cents: amountCents,
    category,
    incurred_at: incurredAt,
    is_recurring: isRecurring,
    paid_at: alreadyPaid ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);

  revalidateFinance();
}

export async function markExpensePaid(expenseId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("expenses")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", expenseId);
  if (error) throw new Error(error.message);

  revalidateFinance();
}

export async function deleteExpense(expenseId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw new Error(error.message);

  revalidateFinance();
}
