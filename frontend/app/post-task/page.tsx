"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useCreateTask } from "@/hooks/useTasks";
import { useIdentityStatus } from "@/hooks/useIdentity";
import { IdentityVerificationPrompt } from "@/components/IdentityVerification";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["design", "development", "writing", "marketing", "data", "video", "audio", "other"];

export default function PostTaskPage() {
  const { address } = useAccount();
  const { data: identity } = useIdentityStatus();
  const { mutateAsync: createTask, isPending } = useCreateTask();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "development",
    rewardGDollar: "",
    deadlineDays: "7",
    releaseAsStream: true,
    payoutDurationDays: "7",
  });

  const [created, setCreated] = useState<string | null>(null);

  if (!address) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gd-muted">Connect your wallet to post a task.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const deadlineUnix = Math.floor(Date.now() / 1000) + parseInt(form.deadlineDays) * 86400;

    const result = await createTask({
      title: form.title,
      description: form.description,
      category: form.category,
      rewardGDollar: form.rewardGDollar,
      deadlineUnix,
      releaseAsStream: form.releaseAsStream,
      payoutDurationDays: parseInt(form.payoutDurationDays),
    });

    setCreated(result.taskId);
    setTimeout(() => router.push(`/tasks/${result.taskId}`), 2000);
  };

  if (created) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <CheckCircle2 className="h-16 w-16 text-gd-green mx-auto" />
        <h2 className="text-2xl font-bold">Task posted!</h2>
        <p className="text-gd-muted">Redirecting to your task…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Post a Task</h1>

      {!identity?.isWhitelisted && <IdentityVerificationPrompt />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-gd-border bg-gd-card p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gd-muted">Title</label>
            <input
              required
              maxLength={120}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Short task title (max 120 chars)"
              className="mt-1 w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gd-muted">Description</label>
            <textarea
              required
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Full task description including deliverable specification…"
              className="mt-1 w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gd-muted">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text focus:outline-none focus:border-gd-green"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gd-muted">Reward (G$)</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.rewardGDollar}
                onChange={(e) => setForm({ ...form, rewardGDollar: e.target.value })}
                placeholder="e.g. 50"
                className="mt-1 w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gd-muted">Deadline (days)</label>
              <input
                required
                type="number"
                min="1"
                value={form.deadlineDays}
                onChange={(e) => setForm({ ...form, deadlineDays: e.target.value })}
                className="mt-1 w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text focus:outline-none focus:border-gd-green"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gd-muted">Payout stream duration (days)</label>
              <input
                type="number"
                min="1"
                value={form.payoutDurationDays}
                onChange={(e) => setForm({ ...form, payoutDurationDays: e.target.value })}
                className="mt-1 w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text focus:outline-none focus:border-gd-green"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="stream"
              checked={form.releaseAsStream}
              onChange={(e) => setForm({ ...form, releaseAsStream: e.target.checked })}
              className="h-4 w-4 accent-gd-green"
            />
            <label htmlFor="stream" className="text-sm text-gd-muted">
              Release payment as Superfluid stream (recommended)
            </label>
          </div>
        </div>

        <div className="text-xs text-gd-muted rounded-lg bg-gd-card border border-gd-border p-3">
          A 2% platform fee will be added on top of the reward. 50% goes to the Worker Advancement Pool.
        </div>

        <button
          type="submit"
          disabled={isPending || !identity?.isWhitelisted}
          className="w-full rounded-xl bg-gd-green py-3 font-medium text-black hover:bg-green-400 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Posting task…
            </span>
          ) : (
            "Post Task & Deposit Escrow"
          )}
        </button>
      </form>
    </div>
  );
}
