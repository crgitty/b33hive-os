"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/projects/data";

export async function createPhase(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) throw new Error("A phase name is required.");

  const { data: existing } = await supabase
    .from("phases")
    .select("sequence")
    .eq("project_id", projectId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("phases").insert({
    project_id: projectId,
    name,
    sequence: (existing?.sequence ?? 0) + 1,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function updatePhaseGateUrl(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const phaseId = String(formData.get("phase_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const url = String(formData.get("gate_artifact_url") ?? "").trim() || null;

  const { error } = await supabase
    .from("phases")
    .update({ gate_artifact_url: url })
    .eq("id", phaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function approvePhaseGate(phaseId: string, projectId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("phases")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", phaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function createDeliverable(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const projectId = String(formData.get("project_id") ?? "");
  const phaseId = String(formData.get("phase_id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) throw new Error("A deliverable name is required.");

  const { error } = await supabase.from("deliverables").insert({
    project_id: projectId,
    phase_id: phaseId,
    name,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function approveQC(deliverableId: string, projectId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("deliverables")
    .update({ internal_qc_approved_at: new Date().toISOString() })
    .eq("id", deliverableId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function setClientVisible(
  deliverableId: string,
  projectId: string,
  visible: boolean,
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("deliverables")
    .update({ client_visible_at: visible ? new Date().toISOString() : null })
    .eq("id", deliverableId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/status`);
}

export async function incrementRevision(
  deliverableId: string,
  projectId: string,
  currentCount: number,
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("deliverables")
    .update({ revision_count: currentCount + 1 })
    .eq("id", deliverableId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectStatus(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const projectId = String(formData.get("project_id") ?? "");
  const status = String(formData.get("status") ?? "") as ProjectStatus;

  const closesProject = status === "complete" || status === "cancelled";
  const { error } = await supabase
    .from("projects")
    .update({
      status,
      closed_at: closesProject ? new Date().toISOString() : null,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}
