import Link from "next/link";
import { getPipelineBoard } from "@/lib/pipeline/data";
import { PipelineBoard } from "@/app/pipeline/PipelineBoard";
import { STAGE_ORDER, type DealStage } from "@/lib/overview/data";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  const board = await getPipelineBoard();
  const highlightStage = STAGE_ORDER.includes(stage as DealStage)
    ? (stage as DealStage)
    : null;

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

      <PipelineBoard board={board} highlightStage={highlightStage} />
    </main>
  );
}
