import {
  getActivePilotCount,
  getPilots,
  getProblemOptions,
  getProblems,
} from "@/lib/intelligence/data";
import { OverdueBanner } from "@/app/intelligence/_components/OverdueBanner";
import { ProblemLog } from "@/app/intelligence/_components/ProblemLog";
import { PilotTracker } from "@/app/intelligence/_components/PilotTracker";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const [problems, pilots, problemOptions, activeCount] = await Promise.all([
    getProblems(),
    getPilots(),
    getProblemOptions(),
    getActivePilotCount(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-medium">Intelligence</h1>
      </header>

      <OverdueBanner pilots={pilots} />

      <PilotTracker pilots={pilots} problemOptions={problemOptions} activeCount={activeCount} />

      <ProblemLog problems={problems} />
    </main>
  );
}
