import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface ProblemRow {
  id: string;
  org_type: string;
  description: string;
  frequency_score: number;
  pain_score: number;
  combined_score: number;
  is_flagged: boolean;
  current_workaround: string | null;
  current_spend_cents: number | null;
  purchasing_authority: boolean | null;
  productization_potential: number | null;
  logged_at: string;
}

export async function getProblems(): Promise<ProblemRow[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("problems")
    .select("*")
    .order("combined_score", { ascending: false })
    .order("logged_at", { ascending: false });
  return data ?? [];
}

export interface ProblemOption {
  id: string;
  label: string;
}

export async function getProblemOptions(): Promise<ProblemOption[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("problems")
    .select("id, description")
    .order("logged_at", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    label: p.description.length > 70 ? `${p.description.slice(0, 70)}…` : p.description,
  }));
}

export type PilotStatus = "planned" | "running" | "decided";
export type PilotDecision = "remain_service" | "become_product" | "form_venture" | "abandon";

export const PILOT_DECISION_LABELS: Record<PilotDecision, string> = {
  remain_service: "Remain a service",
  become_product: "Become a product",
  form_venture: "Form a venture",
  abandon: "Abandon",
};

export interface PilotRow {
  id: string;
  problem_id: string;
  problem_description: string;
  customer_count: number;
  status: PilotStatus;
  launched_at: string | null;
  decision_due_at: string | null;
  decision: PilotDecision | null;
  decided_at: string | null;
  daysRemaining: number | null;
  isOverdue: boolean;
}

function unwrapOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function getPilots(): Promise<PilotRow[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("pilots")
    .select(
      "id, problem_id, customer_count, status, launched_at, decision_due_at, decision, decided_at, problems(description)",
    )
    .order("decision_due_at", { ascending: true, nullsFirst: false });

  return (data ?? []).map((p) => {
    const problem = unwrapOne(p.problems as unknown) as { description: string } | null;

    let daysRemaining: number | null = null;
    let isOverdue = false;
    if (p.decision_due_at && p.status !== "decided") {
      const diffMs = new Date(p.decision_due_at).getTime() - Date.now();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isOverdue = diffMs < 0;
    }

    return {
      id: p.id,
      problem_id: p.problem_id,
      problem_description: problem?.description ?? "Unknown problem",
      customer_count: p.customer_count,
      status: p.status,
      launched_at: p.launched_at,
      decision_due_at: p.decision_due_at,
      decision: p.decision,
      decided_at: p.decided_at,
      daysRemaining,
      isOverdue,
    };
  });
}

export async function getActivePilotCount(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count } = await supabase
    .from("pilots")
    .select("*", { count: "exact", head: true })
    .in("status", ["planned", "running"]);
  return count ?? 0;
}
