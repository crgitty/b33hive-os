import Link from "next/link";
import { getPipelineBoard } from "@/lib/pipeline/data";
import { PipelineBoard } from "@/app/pipeline/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const board = await getPipelineBoard();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-medium">Pipeline</h1>
        <Link
          href="/pipeline/deals/new"
          className="rounded-md bg-gold px-3 py-1.5 text-sm text-background"
        >
          Add deal
        </Link>
      </header>

      <PipelineBoard board={board} />
    </main>
  );
}
