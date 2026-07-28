import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectStatus = "active" | "on_hold" | "complete" | "cancelled";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  cancelled: "Cancelled",
};

export interface ProjectListItem {
  id: string;
  contact_name: string;
  contact_org: string | null;
  offer_name: string;
  status: ProjectStatus;
  started_at: string;
  phase_count: number;
  deliverable_count: number;
}

export async function getProjectsList(): Promise<ProjectListItem[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, status, started_at, contacts(name, org), offers(name), phases(id), deliverables(id)",
    )
    .order("started_at", { ascending: false });

  return (data ?? []).map((p) => {
    const contact = unwrapOne(p.contacts as unknown);
    const offer = unwrapOne(p.offers as unknown);
    return {
      id: p.id,
      contact_name: (contact as { name: string } | null)?.name ?? "Unknown",
      contact_org: (contact as { org: string | null } | null)?.org ?? null,
      offer_name: (offer as { name: string } | null)?.name ?? p.status,
      status: p.status,
      started_at: p.started_at,
      phase_count: Array.isArray(p.phases) ? p.phases.length : p.phases ? 1 : 0,
      deliverable_count: Array.isArray(p.deliverables)
        ? p.deliverables.length
        : p.deliverables
          ? 1
          : 0,
    };
  });
}

export interface Deliverable {
  id: string;
  phase_id: string | null;
  name: string;
  internal_qc_approved_at: string | null;
  client_visible_at: string | null;
  revision_count: number;
}

export interface Phase {
  id: string;
  name: string;
  sequence: number;
  gate_artifact_url: string | null;
  approved_at: string | null;
  deliverables: Deliverable[];
}

export interface ProjectDetail {
  id: string;
  contact_id: string;
  contact_name: string;
  offer_type: string;
  offer_name: string;
  status: ProjectStatus;
  started_at: string;
  closed_at: string | null;
  phases: Phase[];
  unassignedDeliverables: Deliverable[];
}

function unwrapOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const supabase = getSupabaseServerClient();

  const [{ data: project }, { data: phases }, { data: deliverables }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, contact_id, offer_type, status, started_at, closed_at, contacts(name), offers(name)")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("phases")
      .select("id, name, sequence, gate_artifact_url, approved_at")
      .eq("project_id", projectId)
      .order("sequence", { ascending: true }),
    supabase
      .from("deliverables")
      .select("id, phase_id, name, internal_qc_approved_at, client_visible_at, revision_count")
      .eq("project_id", projectId)
      .order("name", { ascending: true }),
  ]);

  if (!project) return null;

  const deliverablesByPhase = new Map<string | null, Deliverable[]>();
  for (const d of deliverables ?? []) {
    const key = d.phase_id;
    if (!deliverablesByPhase.has(key)) deliverablesByPhase.set(key, []);
    deliverablesByPhase.get(key)!.push(d);
  }

  const contact = unwrapOne(project.contacts as unknown) as { name: string } | null;
  const offer = unwrapOne(project.offers as unknown) as { name: string } | null;

  return {
    id: project.id,
    contact_id: project.contact_id,
    contact_name: contact?.name ?? "Unknown",
    offer_type: project.offer_type,
    offer_name: offer?.name ?? project.offer_type,
    status: project.status,
    started_at: project.started_at,
    closed_at: project.closed_at,
    phases: (phases ?? []).map((p) => ({
      ...p,
      deliverables: deliverablesByPhase.get(p.id) ?? [],
    })),
    unassignedDeliverables: deliverablesByPhase.get(null) ?? [],
  };
}

export interface ClientPhase {
  name: string;
  sequence: number;
  approved: boolean;
}

export interface ClientDeliverable {
  name: string;
  client_visible_at: string;
}

export interface ProjectClientView {
  contact_name: string;
  offer_name: string;
  status: ProjectStatus;
  started_at: string;
  phases: ClientPhase[];
  deliverables: ClientDeliverable[];
}

export async function getProjectClientView(
  projectId: string,
): Promise<ProjectClientView | null> {
  const detail = await getProjectDetail(projectId);
  if (!detail) return null;

  return {
    contact_name: detail.contact_name,
    offer_name: detail.offer_name,
    status: detail.status,
    started_at: detail.started_at,
    phases: detail.phases.map((p) => ({
      name: p.name,
      sequence: p.sequence,
      approved: !!p.approved_at,
    })),
    deliverables: [...detail.phases.flatMap((p) => p.deliverables), ...detail.unassignedDeliverables]
      .filter((d): d is Deliverable & { client_visible_at: string } => !!d.client_visible_at)
      .map((d) => ({ name: d.name, client_visible_at: d.client_visible_at })),
  };
}
