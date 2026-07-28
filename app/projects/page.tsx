import { getProjectsList } from "@/lib/projects/data";
import { ProjectsListClient } from "@/app/projects/ProjectsListClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjectsList();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <div className="text-sm text-muted">B33HIVE OS</div>
        <h1 className="text-2xl font-medium">Projects</h1>
      </header>

      <ProjectsListClient projects={projects} />
    </main>
  );
}
