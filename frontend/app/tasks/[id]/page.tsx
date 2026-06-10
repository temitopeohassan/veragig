"use client";

import { useParams } from "next/navigation";
import { useTask, useApplyToTask } from "@/hooks/useTasks";
import { useAccount } from "wagmi";
import { formatGDollar, shortenAddress } from "@/lib/utils";
import { Loader2, Clock, User, CheckCircle2, AlertTriangle } from "lucide-react";
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
  const isClient = address?.toLowerCase() === task.client_address?.toLowerCase();
  const canApply = task.status === "open" && address && !isClient;

  const handleApply = async () => {
    if (!proposal.trim()) return;
    await applyToTask({
      taskId: task.id,
      proposal,
      estimatedDays: estimatedDays ? parseInt(estimatedDays) : undefined,
    });
    setApplied(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gd-border bg-gd-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-gd-text">{task.title}</h1>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusStyle.color}`}>
            {statusStyle.label}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-gd-green font-bold text-lg">
            {formatGDollar(task.reward_wei)} G$
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

        <div className="border-t border-gd-border pt-4">
          <h2 className="text-sm font-medium text-gd-muted mb-2">Description</h2>
          <p className="text-gd-text text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
        </div>
      </div>

      {/* Apply section */}
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
