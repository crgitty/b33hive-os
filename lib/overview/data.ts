import { getSupabaseServerClient } from "@/lib/supabase/server";
import { daysAgoIso, monthKey, startOfWeekIso } from "@/lib/dates";

export type DealStage =
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";

export const STAGE_ORDER: DealStage[] = [
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

export const STAGE_LABELS: Record<DealStage, string> = {
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

/** A metric that may not be computable yet — the honest empty state, not a zero. */
export type Metric =
  | { known: true; value: number }
  | { known: false; reason: string };

export type GateStatus = "pass" | "fail" | "not_started";

export interface GateCondition {
  label: string;
  status: GateStatus;
  detail: string;
}

export interface OverviewData {
  cashOnHandCents: Metric;
  cashAsOf: string | null;
  weeksRunway: Metric;
  pipelineValueCents: number;
  mrrCents: number;
  stageCounts: Record<DealStage, number>;
  activeProjects: number;
  hoursThisWeek: number;
  receivables30PlusCents: number;
  problemsTotal: number;
  problemsFlagged: number;
  gate1: GateCondition[];
}

// A to-one embed (deal_id is unique) comes back as an object from Supabase, but as an
// array if the relationship can't be resolved as one-to-one — handle both defensively.
function unwrapOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function getOverviewData(): Promise<OverviewData> {
  const supabase = getSupabaseServerClient();

  const [
    { data: cashSnapshot },
    { data: expenses90 },
    { data: deals },
    { data: offers },
    { data: projects },
    { data: paidInvoices },
    { data: unpaidInvoices },
    { data: timeEntriesThisWeek },
    { count: problemsTotal },
    { count: problemsFlagged },
    { data: earliestDeal },
    { data: earliestProject },
  ] = await Promise.all([
    supabase
      .from("cash_snapshots")
      .select("balance_cents, as_of")
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("amount_cents, incurred_at")
      .gte("incurred_at", daysAgoIso(90)),
    supabase.from("deals").select("id, value_cents, stage"),
    supabase.from("offers").select("slug, is_recurring"),
    supabase
      .from("projects")
      .select("id, status, offer_type, contact_id, started_at, deals(value_cents)"),
    supabase
      .from("invoices")
      .select("amount_cents, paid_at, project_id")
      .not("paid_at", "is", null)
      .gte("paid_at", daysAgoIso(200)),
    supabase
      .from("invoices")
      .select("amount_cents")
      .is("paid_at", null)
      .not("issued_at", "is", null)
      .lte("issued_at", daysAgoIso(30)),
    supabase
      .from("time_entries")
      .select("hours")
      .gte("entry_date", startOfWeekIso().slice(0, 10)),
    supabase.from("problems").select("*", { count: "exact", head: true }),
    supabase
      .from("problems")
      .select("*", { count: "exact", head: true })
      .eq("is_flagged", true),
    supabase
      .from("deals")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("started_at")
      .order("started_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  // --- Pipeline value + stage counts ---------------------------------------
  const stageCounts = Object.fromEntries(
    STAGE_ORDER.map((s) => [s, 0]),
  ) as Record<DealStage, number>;
  let pipelineValueCents = 0;
  for (const d of deals ?? []) {
    const stage = d.stage as DealStage;
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
    if (stage !== "won" && stage !== "lost") {
      pipelineValueCents += d.value_cents;
    }
  }

  // --- MRR -------------------------------------------------------------------
  const recurringByOffer = new Map(
    (offers ?? []).map((o) => [o.slug, o.is_recurring as boolean]),
  );
  let mrrCents = 0;
  let activeProjects = 0;
  for (const p of projects ?? []) {
    if (p.status === "active") {
      activeProjects += 1;
      if (recurringByOffer.get(p.offer_type)) {
        const deal = unwrapOne(p.deals as unknown);
        if (deal) mrrCents += (deal as { value_cents: number }).value_cents;
      }
    }
  }

  // --- Cash + runway -----------------------------------------------------
  const cashOnHandCents: Metric = cashSnapshot
    ? { known: true, value: cashSnapshot.balance_cents }
    : { known: false, reason: "No cash snapshot logged yet" };

  const expenses90Total = (expenses90 ?? []).reduce(
    (sum, e) => sum + e.amount_cents,
    0,
  );
  const weeklyBurnCents = expenses90Total / (90 / 7);

  const weeksRunway: Metric =
    !cashSnapshot || weeklyBurnCents === 0
      ? { known: false, reason: "Not enough expense history yet" }
      : { known: true, value: cashSnapshot.balance_cents / weeklyBurnCents };

  // --- Hours this week / receivables / problems --------------------------
  const hoursThisWeek = (timeEntriesThisWeek ?? []).reduce(
    (sum, t) => sum + Number(t.hours),
    0,
  );
  const receivables30PlusCents = (unpaidInvoices ?? []).reduce(
    (sum, i) => sum + i.amount_cents,
    0,
  );

  // --- Gate 1 --------------------------------------------------------------
  const businessStartIso =
    [earliestDeal?.created_at, earliestProject?.started_at]
      .filter((x): x is string => !!x)
      .sort()[0] ?? null;

  const gate1 = computeGate1({
    businessStartIso,
    paidInvoices: paidInvoices ?? [],
    projects: projects ?? [],
    recurringByOffer,
    expenses90Total,
    cashOnHandCents: cashSnapshot?.balance_cents ?? null,
  });

  return {
    cashOnHandCents,
    cashAsOf: cashSnapshot?.as_of ?? null,
    weeksRunway,
    pipelineValueCents,
    mrrCents,
    stageCounts,
    activeProjects,
    hoursThisWeek,
    receivables30PlusCents,
    problemsTotal: problemsTotal ?? 0,
    problemsFlagged: problemsFlagged ?? 0,
    gate1,
  };
}

interface Gate1Input {
  businessStartIso: string | null;
  paidInvoices: { amount_cents: number; paid_at: string; project_id: string }[];
  projects: {
    id: string;
    contact_id: string;
    offer_type: string;
    deals: unknown;
  }[];
  recurringByOffer: Map<string, boolean>;
  expenses90Total: number;
  cashOnHandCents: number | null;
}

function computeGate1(input: Gate1Input): GateCondition[] {
  const {
    businessStartIso,
    paidInvoices,
    projects,
    recurringByOffer,
    expenses90Total,
    cashOnHandCents,
  } = input;

  const projectById = new Map(projects.map((p) => [p.id, p]));

  const trailing90Iso = daysAgoIso(90);
  const trailing90Invoices = paidInvoices.filter((i) => i.paid_at >= trailing90Iso);
  const trailing90Revenue = trailing90Invoices.reduce(
    (sum, i) => sum + i.amount_cents,
    0,
  );

  if (!businessStartIso) {
    const notStarted = (label: string): GateCondition => ({
      label,
      status: "not_started",
      detail: "No pipeline or project activity yet",
    });
    return [
      notStarted("Six months of stable revenue"),
      notStarted("Positive operating cash flow"),
      notStarted("Cash reserve ≥ 3 months expenses"),
      notStarted("No single client > 30% of trailing-90-day revenue"),
      notStarted("Recurring revenue ≥ 40% of total"),
    ];
  }

  const monthsOfHistory = Math.floor(
    (Date.now() - new Date(businessStartIso).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  );

  // Condition 1: six months of stable (non-zero) revenue.
  let condition1: GateCondition;
  if (monthsOfHistory < 6) {
    condition1 = {
      label: "Six months of stable revenue",
      status: "not_started",
      detail: `${monthsOfHistory} of 6 months tracked`,
    };
  } else {
    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(monthKey(d.toISOString()));
    }
    const revenueByMonth = new Map<string, number>();
    for (const inv of paidInvoices) {
      const k = monthKey(inv.paid_at);
      revenueByMonth.set(k, (revenueByMonth.get(k) ?? 0) + inv.amount_cents);
    }
    const zeroMonths = monthKeys.filter((k) => !((revenueByMonth.get(k) ?? 0) > 0));
    condition1 = {
      label: "Six months of stable revenue",
      status: zeroMonths.length === 0 ? "pass" : "fail",
      detail:
        zeroMonths.length === 0
          ? "Revenue in every trailing month"
          : `${zeroMonths.length} of 6 trailing months had no revenue`,
    };
  }

  // Condition 2: positive operating cash flow (trailing 90 days).
  let condition2: GateCondition;
  if (trailing90Revenue === 0 && expenses90Total === 0) {
    condition2 = {
      label: "Positive operating cash flow",
      status: "not_started",
      detail: "No revenue or expense history yet",
    };
  } else {
    const net = trailing90Revenue - expenses90Total;
    condition2 = {
      label: "Positive operating cash flow",
      status: net > 0 ? "pass" : "fail",
      detail: `Trailing 90 days: net ${net >= 0 ? "+" : ""}${Math.round(net / 100)} dollars`,
    };
  }

  // Condition 3: cash reserve >= 3 months expenses (trailing 90-day expenses ≈ 3 months).
  let condition3: GateCondition;
  if (cashOnHandCents === null || expenses90Total === 0) {
    condition3 = {
      label: "Cash reserve ≥ 3 months expenses",
      status: "not_started",
      detail: !cashOnHandCents
        ? "No cash snapshot logged yet"
        : "No expense history to size the target",
    };
  } else {
    condition3 = {
      label: "Cash reserve ≥ 3 months expenses",
      status: cashOnHandCents >= expenses90Total ? "pass" : "fail",
      detail: `Cash covers ${(cashOnHandCents / (expenses90Total / 3)).toFixed(1)} months at current burn`,
    };
  }

  // Condition 4: no single client > 30% of trailing-90-day revenue.
  let condition4: GateCondition;
  if (trailing90Revenue === 0) {
    condition4 = {
      label: "No single client > 30% of trailing-90-day revenue",
      status: "not_started",
      detail: "No revenue in the trailing 90 days",
    };
  } else {
    const revenueByContact = new Map<string, number>();
    for (const inv of trailing90Invoices) {
      const project = projectById.get(inv.project_id);
      if (!project) continue;
      revenueByContact.set(
        project.contact_id,
        (revenueByContact.get(project.contact_id) ?? 0) + inv.amount_cents,
      );
    }
    const maxShare = Math.max(...revenueByContact.values(), 0) / trailing90Revenue;
    condition4 = {
      label: "No single client > 30% of trailing-90-day revenue",
      status: maxShare <= 0.3 ? "pass" : "fail",
      detail: `Largest client is ${Math.round(maxShare * 100)}% of trailing-90-day revenue`,
    };
  }

  // Condition 5: recurring revenue >= 40% of total (trailing 90 days).
  let condition5: GateCondition;
  if (trailing90Revenue === 0) {
    condition5 = {
      label: "Recurring revenue ≥ 40% of total",
      status: "not_started",
      detail: "No revenue in the trailing 90 days",
    };
  } else {
    const recurringRevenue = trailing90Invoices.reduce((sum, inv) => {
      const project = projectById.get(inv.project_id);
      if (project && recurringByOffer.get(project.offer_type)) {
        return sum + inv.amount_cents;
      }
      return sum;
    }, 0);
    const share = recurringRevenue / trailing90Revenue;
    condition5 = {
      label: "Recurring revenue ≥ 40% of total",
      status: share >= 0.4 ? "pass" : "fail",
      detail: `Recurring revenue is ${Math.round(share * 100)}% of trailing-90-day total`,
    };
  }

  return [condition1, condition2, condition3, condition4, condition5];
}
