"use client";

import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useState } from "react";
import { useTask, useTaskSubmissions, useSelectWinners } from "@/hooks/useTasks";
import { formatToken, shortenAddress } from "@/lib/utils";
import { Loader2, CheckCircle2, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SelectWinnersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address } = useAccount();

  const { data: task, isLoading: taskLoading } = useTask(id);
  const { data: submissions, isLoading: subsLoading } = useTaskSubmissions(id);
  const { mutateAsync: selectWinners, isPending, error } = useSelectWinners();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  if (taskLoading || subsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gd-muted" />
      </div>
    );
  }

  if (!task) return <div className="text-center py-20 text-gd-muted">Task not found</div>;

  const isClient = address?.toLowerCase() === task.client_address?.toLowerCase();
  if (!isClient) {
    return <div className="text-center py-20 text-gd-muted">Only the task poster can select winners.</div>;
  }
  if (task.task_type !== "bounty") {
    return <div className="text-center py-20 text-gd-muted">This task is not a bounty.</div>;
  }

  const tokenSymbol = task.token_symbol ?? "G$";
  const tokenDecimals = task.token_decimals ?? 18;
  const rewardWei = BigInt(task.reward_wei);

  // Equal split preview: deduplicate by worker, since a worker has one payout share.
  const selectedSubs = (submissions ?? []).filter((s) => selected.has(s.id));
  const uniqueWinners = new Set(selectedSubs.map((s) => s.worker_address.toLowerCase()));
  const winnerCount = uniqueWinners.size;
  const sharePerWinner = winnerCount > 0 ? rewardWei / BigInt(winnerCount) : 0n;

  const toggle = (sid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    await selectWinners({ taskId: task.id, submissionIds: Array.from(selected), rating: 5 });
    setDone(true);
    setTimeout(() => router.push(`/tasks/${task.id}`), 2500);
  };

  if (done) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <CheckCircle2 className="h-16 w-16 text-gd-green mx-auto" />
        <h2 className="text-2xl font-bold">Winners selected!</h2>
        <p className="text-gd-muted">The reward has been split and paid out. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={`/tasks/${task.id}`} className="inline-flex items-center gap-1.5 text-sm text-gd-muted hover:text-gd-text">
        <ArrowLeft className="h-4 w-4" /> Back to task
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Select winners</h1>
        <p className="text-gd-muted text-sm mt-1">
          Choose the winning submissions for <span className="text-gd-text">{task.title}</span>. The
          {" "}
          {formatToken(rewardWei, tokenDecimals)} {tokenSymbol} reward is split equally between the
          selected winners.
        </p>
      </div>

      {/* Split preview */}
      <div className="rounded-xl border border-gd-border bg-gd-card p-4 flex items-center justify-between text-sm">
        <span className="text-gd-muted">
          {winnerCount} winner{winnerCount === 1 ? "" : "s"} selected
        </span>
        <span className="text-gd-green font-medium">
          {winnerCount > 0 ? `${formatToken(sharePerWinner, tokenDecimals)} ${tokenSymbol} each` : "—"}
        </span>
      </div>

      {/* Submissions list */}
      {!submissions?.length ? (
        <div className="text-center py-16 text-gd-muted">No submissions yet.</div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => {
            const isSelected = selected.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  isSelected ? "border-gd-green bg-gd-green/10" : "border-gd-border bg-gd-card hover:border-gd-green/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "border-gd-green bg-gd-green text-black" : "border-gd-border"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-4 w-4" />}
                    </span>
                    <span className="text-sm font-medium text-gd-text">
                      {shortenAddress(s.worker_address)}
                    </span>
                  </div>
                  {s.deliverable_cid && (
                    <a
                      href={s.deliverable_cid.startsWith("http") ? s.deliverable_cid : `https://ipfs.io/ipfs/${s.deliverable_cid}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-gd-muted hover:text-gd-green"
                    >
                      View deliverable <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {s.notes && <p className="text-sm text-gd-muted mt-2 whitespace-pre-wrap">{s.notes}</p>}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}

      <button
        onClick={handleConfirm}
        disabled={isPending || selected.size === 0}
        className="w-full rounded-xl bg-gd-green py-3 font-medium text-black hover:bg-green-400 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Paying winners…
          </span>
        ) : (
          `Confirm & pay ${winnerCount} winner${winnerCount === 1 ? "" : "s"}`
        )}
      </button>
    </div>
  );
}
