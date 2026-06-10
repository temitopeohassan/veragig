"use client";

import { useGoodScore, useCreditNarrative } from "@/hooks/useGoodScore";
import { scoreColor, loanTierLabel } from "@/lib/utils";
import { TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";

export function GoodScoreWidget() {
  const { address } = useAccount();
  const { data: scoreData, isLoading } = useGoodScore();
  const { data: narrative } = useCreditNarrative();

  if (!address) return null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gd-border bg-gd-card p-5 flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-gd-muted" />
      </div>
    );
  }

  const score = scoreData?.good_score ?? 0;
  const tier = scoreData?.loan_tier ?? "none";

  return (
    <div className="rounded-xl border border-gd-border bg-gd-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gd-muted">GoodScore</h3>
        <TrendingUp className="h-4 w-4 text-gd-muted" />
      </div>

      <div className="flex items-end gap-2">
        <span className={`text-5xl font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
        <span className="text-gd-muted text-sm mb-1">/ 850</span>
      </div>

      <div className="text-xs text-gd-muted">
        Loan tier:{" "}
        <span className="text-gd-text font-medium">{loanTierLabel(tier)}</span>
      </div>

      {scoreData && (
        <div className="space-y-1.5">
          <SignalBar label="Completion rate" value={scoreData.signals.task_completion_rate * 100} max={100} unit="%" />
          <SignalBar label="Earning streak" value={scoreData.signals.earnings_consistency_weeks} max={52} unit=" wks" />
          <SignalBar label="UBI streak" value={scoreData.signals.ubi_claim_streak_days} max={365} unit=" days" />
        </div>
      )}

      {narrative && (
        <p className="text-xs text-gd-muted leading-relaxed border-t border-gd-border pt-3">
          {narrative.narrative}
        </p>
      )}
    </div>
  );
}

function SignalBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gd-muted">{label}</span>
        <span className="text-gd-text">{Math.round(value)}{unit}</span>
      </div>
      <div className="h-1 bg-gd-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gd-green rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
