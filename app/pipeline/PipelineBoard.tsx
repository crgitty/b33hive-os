"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STAGE_LABELS, STAGE_ORDER, type DealStage } from "@/lib/overview/data";
import type { PipelineDeal } from "@/lib/pipeline/data";
import { formatCents } from "@/lib/money";
import { deleteDeals, updateDealStage } from "@/lib/pipeline/actions";

const STALE_LABEL: Record<NonNullable<PipelineDeal["stale_reason"]>, string> = {
  silent_21d: "21+ days silent — Lost candidate",
  contacted_14d: "14+ days in Contacted",
  proposal_sent_10d: "10+ days in Proposal sent",
};

function DealCard({
  deal,
  selected,
  onToggleSelect,
  onDragStart,
}: {
  deal: PipelineDeal;
  selected: boolean;
  onToggleSelect: (dealId: string) => void;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      className="cursor-grab rounded-md border border-border bg-background p-3 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(deal.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
          aria-label={`Select ${deal.contact_name}`}
        />
        <Link
          href={`/pipeline/contacts/${deal.contact_id}`}
          className="flex-1 text-sm font-medium hover:underline"
        >
          {deal.contact_name}
        </Link>
        <Link
          href={`/pipeline/deals/${deal.id}/edit`}
          className="text-xs text-muted hover:text-gold"
        >
          Edit
        </Link>
      </div>
      {deal.contact_org && (
        <div className="ml-6 text-xs text-muted">{deal.contact_org}</div>
      )}
      <div className="ml-6 mt-2 text-sm text-gold tabular-nums">
        {formatCents(deal.value_cents)}
      </div>
      <div className="ml-6 text-xs text-muted">{deal.offer_name}</div>
      <div className="ml-6 mt-2 text-xs text-muted">
        {deal.days_in_stage} {deal.days_in_stage === 1 ? "day" : "days"} in stage
      </div>
      {deal.stale_reason && (
        <div className="ml-6 mt-2 flex items-center gap-1.5 text-xs text-bad">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bad" aria-hidden />
          {STALE_LABEL[deal.stale_reason]}
        </div>
      )}
    </div>
  );
}

export function PipelineBoard({
  board,
  highlightStage,
}: {
  board: Record<DealStage, PipelineDeal[]>;
  highlightStage?: DealStage | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [pendingLoss, setPendingLoss] = useState<{ dealId: string } | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(dealId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
  }

  function handleDragStart(e: React.DragEvent, dealId: string) {
    e.dataTransfer.setData("text/plain", dealId);
    e.dataTransfer.effectAllowed = "move";
  }

  function applyStageChange(dealId: string, stage: DealStage, reason?: string) {
    startTransition(async () => {
      await updateDealStage(dealId, stage, reason);
      router.refresh();
    });
  }

  function handleDrop(e: React.DragEvent, stage: DealStage) {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData("text/plain");
    if (!dealId) return;

    if (stage === "lost") {
      setPendingLoss({ dealId });
      setLossReason("");
      return;
    }
    applyStageChange(dealId, stage);
  }

  function confirmLoss() {
    if (!pendingLoss) return;
    applyStageChange(pendingLoss.dealId, "lost", lossReason.trim() || undefined);
    setPendingLoss(null);
  }

  function handleDeleteSelected() {
    const count = selected.size;
    if (
      !confirm(
        `Delete ${count} deal${count === 1 ? "" : "s"}? The linked contact and its activity history are kept.`,
      )
    ) {
      return;
    }
    const ids = Array.from(selected);
    startTransition(async () => {
      await deleteDeals(ids);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {STAGE_ORDER.map((stage) => (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
            onDrop={(e) => handleDrop(e, stage)}
            className={`flex flex-col gap-3 rounded-lg border p-3 ${
              dragOverStage === stage || highlightStage === stage
                ? "border-gold bg-surface"
                : "border-border bg-surface"
            }`}
          >
            <div className="flex items-baseline justify-between px-1">
              <span className="text-sm text-muted">{STAGE_LABELS[stage]}</span>
              <span className="text-xs text-muted">{board[stage].length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {board[stage].length === 0 && (
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted">
                  No deals
                </div>
              )}
              {board[stage].map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  selected={selected.has(deal.id)}
                  onToggleSelect={toggleSelect}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {pendingLoss && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4">
            <div className="text-sm font-medium">Mark as Lost</div>
            <p className="mt-1 text-xs text-muted">
              Optional: why did this deal fall through?
            </p>
            <textarea
              autoFocus
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-md border border-border bg-background p-2 text-sm text-foreground"
              placeholder="Loss reason"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setPendingLoss(null)}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={confirmLoss}
                className="rounded-md bg-gold px-3 py-1.5 text-sm text-background"
              >
                Mark Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2 shadow-lg">
          <span className="text-sm">{selected.size} selected</span>
          <button
            onClick={handleDeleteSelected}
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
