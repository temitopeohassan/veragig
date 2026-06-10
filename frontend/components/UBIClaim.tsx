"use client";

import { useUBIEntitlement, useNextClaimTime, useClaimUBI } from "@/hooks/useUBI";
import { useAccount } from "wagmi";
import { Coins, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function UBIClaimWidget() {
  const { address } = useAccount();
  const { data: entitlement, isLoading: loadingEntitlement } = useUBIEntitlement();
  const { data: nextClaim } = useNextClaimTime();
  const { mutateAsync: claimUBI, isPending: claiming } = useClaimUBI();
  const [claimed, setClaimed] = useState(false);

  if (!address) return null;

  const handleClaim = async () => {
    await claimUBI();
    setClaimed(true);
    setTimeout(() => setClaimed(false), 5000);
  };

  return (
    <div className="rounded-xl border border-gd-border bg-gd-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gd-muted">Daily G$ UBI</h3>
        <Coins className="h-4 w-4 text-gd-muted" />
      </div>

      {loadingEntitlement ? (
        <div className="flex items-center gap-2 text-gd-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Checking entitlement…</span>
        </div>
      ) : entitlement?.canClaim ? (
        <>
          <div>
            <p className="text-3xl font-bold text-gd-green">{entitlement.entitlementGDollar} G$</p>
            <p className="text-xs text-gd-muted mt-1">available to claim now</p>
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming || claimed}
            className={cn(
              "w-full rounded-lg py-2.5 text-sm font-medium transition-colors",
              claimed
                ? "bg-gd-green/20 text-gd-green"
                : "bg-gd-green text-black hover:bg-green-400 disabled:opacity-50"
            )}
          >
            {claiming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Claiming…
              </span>
            ) : claimed ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Claimed!
              </span>
            ) : (
              "Claim G$"
            )}
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2 text-gd-muted">
          <Clock className="h-4 w-4" />
          <div className="text-sm">
            <span>Next claim in </span>
            <span className="text-gd-text font-medium">
              {nextClaim ? formatCountdown(nextClaim.secondsUntilClaim) : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
