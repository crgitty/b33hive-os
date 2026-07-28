"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PROJECT_STATUS_LABELS, type ProjectListItem } from "@/lib/projects/data";
import { formatDate } from "@/lib/dates";
import { deleteProjects } from "@/lib/projects/actions";

export function ProjectsListClient({ projects }: { projects: ProjectListItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete() {
    const count = selected.size;
    if (
      !confirm(
        `Delete ${count} project${count === 1 ? "" : "s"}? This also removes their phases and deliverables. The underlying deal stays marked Won.`,
      )
    ) {
      return;
    }
    const ids = Array.from(selected);
    setError(null);
    startTransition(async () => {
      try {
        await deleteProjects(ids);
        setSelected(new Set());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete.");
      }
      router.refresh();
    });
  }

  return (
    <>
      {error && (
        <div className="rounded-lg border border-bad p-3 text-sm text-bad">{error}</div>
      )}

      <div className="flex flex-col gap-3">
        {projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
            No projects yet. Projects are created automatically when a deal is marked Won
            in Pipeline.
          </div>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-gold"
          >
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              aria-label={`Select ${p.contact_name}`}
            />
            <Link
              href={`/projects/${p.id}`}
              className="flex flex-1 items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium">{p.contact_name}</div>
                <div className="text-xs text-muted">
                  {p.offer_name}
                  {p.contact_org ? ` — ${p.contact_org}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs text-muted">
                <span>{p.phase_count} phases</span>
                <span>{p.deliverable_count} deliverables</span>
                <span>Started {formatDate(p.started_at)}</span>
                <span className="text-gold">{PROJECT_STATUS_LABELS[p.status]}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2 shadow-lg">
          <span className="text-sm">{selected.size} selected</span>
          <button
            onClick={handleDelete}
            className="rounded-md border border-bad px-3 py-1 text-sm text-bad hover:bg-bad/10"
          >
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
