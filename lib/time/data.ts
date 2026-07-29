import { getSupabaseServerClient } from "@/lib/supabase/server";

export type HoursVariance = "under" | "on_track" | "over";

export interface ProjectHoursRow {
  project_id: string;
  contact_name: string;
  offer_name: string;
  is_recurring: boolean;
  hours_logged: number;
  est_hours_min: number;
  est_hours_max: number;
  variance: HoursVariance;
}

export interface UnmatchedTogglProject {
  toggl_project_id: number;
  toggl_project_name: string | null;
  hours_logged: number;
}

export interface TimeSummary {
  hasAnyEntries: boolean;
  lastSyncedAt: string | null;
  rows: ProjectHoursRow[];
  unmatched: UnmatchedTogglProject[];
}

function unwrapOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function computeVariance(hours: number, min: number, max: number): HoursVariance {
  if (hours > max) return "over";
  if (hours < min) return "under";
  return "on_track";
}

export async function getTimeSummary(): Promise<TimeSummary> {
  const supabase = getSupabaseServerClient();

  const { data: entries } = await supabase
    .from("time_entries")
    .select("project_id, toggl_project_id, toggl_project_name, hours, synced_at");

  const hasAnyEntries = (entries ?? []).length > 0;
  const lastSyncedAt = (entries ?? []).reduce<string | null>(
    (max, e) => (!max || e.synced_at > max ? e.synced_at : max),
    null,
  );

  const hoursByProject = new Map<string, number>();
  const unmatchedByToggl = new Map<number, { name: string | null; hours: number }>();

  for (const e of entries ?? []) {
    if (e.project_id) {
      hoursByProject.set(e.project_id, (hoursByProject.get(e.project_id) ?? 0) + e.hours);
    } else if (e.toggl_project_id) {
      const existing = unmatchedByToggl.get(e.toggl_project_id) ?? {
        name: e.toggl_project_name,
        hours: 0,
      };
      existing.hours += e.hours;
      existing.name = existing.name ?? e.toggl_project_name;
      unmatchedByToggl.set(e.toggl_project_id, existing);
    }
  }

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, contacts(name), offers(name, est_hours_min, est_hours_max, is_recurring)",
    )
    .order("started_at", { ascending: false });

  const rows: ProjectHoursRow[] = (projects ?? []).map((p) => {
    const contact = unwrapOne(p.contacts as unknown) as { name: string } | null;
    const offer = unwrapOne(p.offers as unknown) as {
      name: string;
      est_hours_min: number;
      est_hours_max: number;
      is_recurring: boolean;
    } | null;
    const hours = hoursByProject.get(p.id) ?? 0;
    const min = offer?.est_hours_min ?? 0;
    const max = offer?.est_hours_max ?? 0;

    return {
      project_id: p.id,
      contact_name: contact?.name ?? "Unknown",
      offer_name: offer?.name ?? "Unknown offer",
      is_recurring: offer?.is_recurring ?? false,
      hours_logged: hours,
      est_hours_min: min,
      est_hours_max: max,
      variance: computeVariance(hours, min, max),
    };
  });

  return {
    hasAnyEntries,
    lastSyncedAt,
    rows,
    unmatched: Array.from(unmatchedByToggl.entries()).map(([toggl_project_id, v]) => ({
      toggl_project_id,
      toggl_project_name: v.name,
      hours_logged: v.hours,
    })),
  };
}

/** Per-project logged hours, keyed by B33HIVE project id. Exposed for the Finance view's
 * margin calculation (hours against project value) — not consumed anywhere yet. */
export async function getProjectHoursTotals(): Promise<Record<string, number>> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("time_entries")
    .select("project_id, hours")
    .not("project_id", "is", null);

  const totals: Record<string, number> = {};
  for (const e of data ?? []) {
    if (!e.project_id) continue;
    totals[e.project_id] = (totals[e.project_id] ?? 0) + e.hours;
  }
  return totals;
}

export interface ProjectOption {
  id: string;
  label: string;
}

export async function getProjectOptions(): Promise<ProjectOption[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select("id, contacts(name), offers(name)")
    .order("started_at", { ascending: false });

  return (data ?? []).map((p) => {
    const contact = unwrapOne(p.contacts as unknown) as { name: string } | null;
    const offer = unwrapOne(p.offers as unknown) as { name: string } | null;
    return {
      id: p.id,
      label: `${contact?.name ?? "Unknown"} — ${offer?.name ?? "Unknown offer"}`,
    };
  });
}
