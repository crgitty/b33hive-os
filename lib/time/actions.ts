"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getTogglProjects, getTogglTimeEntries } from "@/lib/toggl/client";

export async function syncToggl() {
  const supabase = getSupabaseServerClient();

  const [entries, togglProjects] = await Promise.all([
    getTogglTimeEntries(),
    getTogglProjects(),
  ]);

  const togglProjectNames = new Map(togglProjects.map((p) => [p.id, p.name]));

  const { data: linkedProjects } = await supabase
    .from("projects")
    .select("id, toggl_project_id")
    .not("toggl_project_id", "is", null);
  const projectByToggl = new Map(
    (linkedProjects ?? []).map((p) => [p.toggl_project_id as number, p.id as string]),
  );

  const deletedIds = entries
    .filter((e) => e.server_deleted_at)
    .map((e) => e.id);

  const rows = entries
    // Running entries carry a negative duration (elapsed-so-far encoded as a negative
    // offset) and have no stop time yet — skip until they're stopped in Toggl.
    .filter((e) => !e.server_deleted_at && e.duration >= 0 && e.stop)
    .map((e) => ({
      toggl_id: e.id,
      hours: e.duration / 3600,
      entry_date: e.start.slice(0, 10),
      description: e.description,
      toggl_project_id: e.project_id,
      toggl_project_name: e.project_id ? togglProjectNames.get(e.project_id) ?? null : null,
      project_id: e.project_id ? projectByToggl.get(e.project_id) ?? null : null,
      synced_at: new Date().toISOString(),
    }));

  if (deletedIds.length > 0) {
    const { error } = await supabase.from("time_entries").delete().in("toggl_id", deletedIds);
    if (error) throw new Error(error.message);
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("time_entries")
      .upsert(rows, { onConflict: "toggl_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/time");
}

export async function linkTogglProject(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const projectId = String(formData.get("project_id") ?? "");
  const togglProjectId = Number(formData.get("toggl_project_id"));
  const togglProjectName = String(formData.get("toggl_project_name") ?? "") || null;

  if (!projectId || !togglProjectId) {
    throw new Error("Select a project to link this Toggl project to.");
  }

  const { error: linkError } = await supabase
    .from("projects")
    .update({ toggl_project_id: togglProjectId, toggl_project_name: togglProjectName })
    .eq("id", projectId);
  if (linkError) throw new Error(linkError.message);

  const { error: backfillError } = await supabase
    .from("time_entries")
    .update({ project_id: projectId })
    .eq("toggl_project_id", togglProjectId)
    .is("project_id", null);
  if (backfillError) throw new Error(backfillError.message);

  revalidatePath("/time");
}
