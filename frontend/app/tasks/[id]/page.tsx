"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useTask, useApplyToTask, useSubmitWork, useTaskSubmissions } from "@/hooks/useTasks";
import { useAccount } from "wagmi";
import { formatToken, shortenAddress } from "@/lib/utils";
import { Loader2, Clock, User, CheckCircle2, Users, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "text-gd-green bg-gd-green/10" },
  assigned: { label: "Assigned", color: "text-blue-400 bg-blue-400/10" },
  submitted: { label: "Under Review", color: "text-yellow-400 bg-yellow-400/10" },
  completed: { label: "Completed", color: "text-gray-400 bg-gray-400/10" },
  disputed: { label: "Disputed", color: "text-red-400 bg-red-400/10" },
  cancelled: { label: "Cancelled", color: "text-gray-500 bg-gray-500/10" },
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading } = useTask(id);
  const { address } = useAccount();

  const { mutateAsync: applyToTask, isPending: applying } = useApplyToTask();
  const [proposal, setProposal] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [applied, setApplied] = useState(false);

  const { mutateAsync: submitWork, isPending: submitting, error: submitError } = useSubmitWork();
  const [deliverableCid, setDeliverableCid] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isBounty = task?.task_type === "bounty";
  const isClient = address?.toLowerCase() === task?.client_address?.toLowerCase();
  const { data: submissions } = useTaskSubmissions(id, !!task && isBounty);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gd-muted" />
      </div>
    );
  }

  if (!task) {
    return <div className="text-center py-20 text-gd-muted">Task not found</div>;
  }

  const statusStyle = STATUS_LABELS[task.status] ?? STATUS_LABELS.open;
  const deadline = new Date(task.deadline_unix * 1000);
  const tokenSymbol = task.token_symbol ?? "G$";
  const tokenDecimals = task.token_decimals ?? 18;

  const canApply = !isBounty && task.status === "open" && address && !isClient;
  const canSubmitBounty = isBounty && task.status === "open" && address && !isClient;

  const handleApply = async () => {
    if (!proposal.trim()) return;
    await applyToTask({
      taskId: task.id,
      proposal,
      estimatedDays: estimatedDays ? parseInt(estimatedDays) : undefined,
    });
    setApplied(true);
  };

  const handleSubmitWork = async () => {
    if (!deliverableCid.trim()) return;
    await submitWork({ taskId: task.id, deliverableCid, notes });
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gd-border bg-gd-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gd-text">{task.title}</h1>
            {isBounty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gd-green/15 px-2.5 py-0.5 text-xs font-medium text-gd-green">
                <Users className="h-3 w-3" /> Bounty
              </span>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusStyle.color}`}>
            {statusStyle.label}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-1.5 text-gd-green font-bold text-lg">
            {formatToken(task.reward_wei, tokenDecimals)} {tokenSymbol}
          </div>
          <div className="flex items-center gap-1.5 text-gd-muted">
            <Clock className="h-4 w-4" />
            Due {formatDistanceToNow(deadline, { addSuffix: true })}
          </div>
          <div className="flex items-center gap-1.5 text-gd-muted">
            <User className="h-4 w-4" />
            {shortenAddress(task.client_address)}
          </div>
        </div>

        {isBounty && (
          <p className="text-xs text-gd-muted">
            Open bounty — multiple people can submit. The poster selects winners and the reward is
            split equally between them.
          </p>
        )}

        <div className="border-t border-gd-border pt-4">
          <h2 className="text-sm font-medium text-gd-muted mb-2">Description</h2>
          <p className="text-gd-text text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
        </div>
      </div>

      {/* Client view of a bounty: manage submissions / select winners */}
      {isBounty && isClient && (
        <div className="rounded-xl border border-gd-border bg-gd-card p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Submissions</h2>
            <p className="text-sm text-gd-muted mt-1">
              {submissions?.length ?? 0} submission{(submissions?.length ?? 0) === 1 ? "" : "s"} so far.
            </p>
          </div>
          {task.status === "open" ? (
            <Link
              href={`/tasks/${task.id}/submissions`}
              className="flex items-center gap-2 rounded-lg bg-gd-green px-4 py-2.5 text-sm font-medium text-black hover:bg-green-400 transition-colors"
            >
              Review &amp; select winners <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="text-sm text-gd-muted">Winners selected</span>
          )}
        </div>
      )}

      {/* Worker: submit work to a bounty */}
      {canSubmitBounty && !submitted && (
        <div className="rounded-xl border border-gd-border bg-gd-card p-6 space-y-4">
          <h2 className="font-medium">Submit your work</h2>
          <input
            value={deliverableCid}
            onChange={(e) => setDeliverableCid(e.target.value)}
            placeholder="Deliverable link or IPFS CID"
            className="w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2.5 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for the poster (optional)…"
            rows={4}
            className="w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2.5 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green resize-none"
          />
          {submitError && (
            <p className="text-sm text-red-400">{(submitError as Error).message}</p>
          )}
          <button
            onClick={handleSubmitWork}
            disabled={submitting || !deliverableCid.trim()}
            className="w-full rounded-lg bg-gd-green py-2.5 text-sm font-medium text-black hover:bg-green-400 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </span>
            ) : (
              "Submit work"
            )}
          </button>
          <p className="text-xs text-gd-muted">You can resubmit to update your entry while the bounty is open.</p>
        </div>
      )}

      {submitted && (
        <div className="rounded-xl border border-gd-green/30 bg-gd-green/10 p-5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-gd-green shrink-0" />
          <p className="text-sm text-gd-green">Work submitted! The poster will review all submissions and select winners.</p>
        </div>
      )}

      {/* Worker: apply to a gig */}
      {canApply && !applied && (
        <div className="rounded-xl border border-gd-border bg-gd-card p-6 space-y-4">
          <h2 className="font-medium">Apply for this task</h2>
          <textarea
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            placeholder="Describe your approach and relevant experience…"
            rows={5}
            className="w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2.5 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green resize-none"
          />
          <input
            type="number"
            value={estimatedDays}
            onChange={(e) => setEstimatedDays(e.target.value)}
            placeholder="Estimated days to complete (optional)"
            className="w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green"
          />
          <button
            onClick={handleApply}
            disabled={applying || !proposal.trim()}
            className="w-full rounded-lg bg-gd-green py-2.5 text-sm font-medium text-black hover:bg-green-400 transition-colors disabled:opacity-50"
          >
            {applying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </span>
            ) : (
              "Submit Application"
            )}
          </button>
        </div>
      )}

      {applied && (
        <div className="rounded-xl border border-gd-green/30 bg-gd-green/10 p-5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-gd-green shrink-0" />
          <p className="text-sm text-gd-green">Application submitted! The client will review and assign the task.</p>
        </div>
      )}
    </div>
  );
}
