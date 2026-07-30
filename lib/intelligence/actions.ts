"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PilotDecision } from "@/lib/intelligence/data";

function dollarsToCents(input: FormDataEntryValue | null): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const dollars = parseFloat(raw);
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : null;
}

// --- Problems --------------------------------------------------------------

export async function createProblem(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const orgType = String(formData.get("org_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const frequencyScore = Number(formData.get("frequency_score"));
  const painScore = Number(formData.get("pain_score"));
  const currentWorkaround = String(formData.get("current_workaround") ?? "").trim() || null;
  const currentSpendCents = dollarsToCents(formData.get("current_spend_dollars"));
  const purchasingAuthority = formData.get("purchasing_authority") === "on";
  const productizationRaw = String(formData.get("productization_potential") ?? "").trim();
  const productizationPotential = productizationRaw ? Number(productizationRaw) : null;

  if (!orgType || !description) {
    throw new Error("Org type and description are required.");
  }

  const { error } = await supabase.from("problems").insert({
    org_type: orgType,
    description,
    frequency_score: frequencyScore,
    pain_score: painScore,
    current_workaround: currentWorkaround,
    current_spend_cents: currentSpendCents,
    purchasing_authority: purchasingAuthority,
    productization_potential: productizationPotential,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/intelligence");
}

export async function deleteProblem(problemId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("problems").delete().eq("id", problemId);
  if (error) throw new Error(error.message);

  revalidatePath("/intelligence");
}

// --- Pilots ------------------------------------------------------------------

export async function createPilot(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const problemId = String(formData.get("problem_id") ?? "");
  const customerCount = Number(formData.get("customer_count") ?? 0) || 0;

  if (!problemId) throw new Error("Select a problem to pilot.");

  const { error } = await supabase.from("pilots").insert({
    problem_id: problemId,
    customer_count: customerCount,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/intelligence");
}

export async function launchPilot(pilotId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("pilots")
    .update({ status: "running", launched_at: new Date().toISOString() })
    .eq("id", pilotId);
  if (error) throw new Error(error.message);

  revalidatePath("/intelligence");
}

export async function updatePilotCustomerCount(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const pilotId = String(formData.get("pilot_id") ?? "");
  const customerCount = Number(formData.get("customer_count") ?? 0) || 0;

  const { error } = await supabase
    .from("pilots")
    .update({ customer_count: customerCount })
    .eq("id", pilotId);
  if (error) throw new Error(error.message);

  revalidatePath("/intelligence");
}

export async function recordPilotDecision(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const pilotId = String(formData.get("pilot_id") ?? "");
  const decision = String(formData.get("decision") ?? "") as PilotDecision;

  if (!pilotId || !decision) throw new Error("Select a decision outcome.");

  const { error } = await supabase
    .from("pilots")
    .update({ status: "decided", decision, decided_at: new Date().toISOString() })
    .eq("id", pilotId);
  if (error) throw new Error(error.message);

  revalidatePath("/intelligence");
}

export async function deletePilot(pilotId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("pilots").delete().eq("id", pilotId);
  if (error) throw new Error(error.message);

  revalidatePath("/intelligence");
}
