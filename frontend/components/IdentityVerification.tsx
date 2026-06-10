"use client";

import { useIdentityStatus, useIdentityExpiry, useGenerateFVLink } from "@/hooks/useIdentity";
import { useAccount } from "wagmi";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function IdentityBadge() {
  const { address } = useAccount();
  const { data: identity, isLoading } = useIdentityStatus();
  const { data: expiry } = useIdentityExpiry();

  if (!address) return null;
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-gd-muted" />;

  if (!identity?.isWhitelisted) {
    return (
      <div className="flex items-center gap-1.5 text-red-400 text-sm">
        <ShieldX className="h-4 w-4" />
        <span>Not verified</span>
      </div>
    );
  }

  if (expiry?.isExpired) {
    return (
      <div className="flex items-center gap-1.5 text-orange-400 text-sm">
        <ShieldAlert className="h-4 w-4" />
        <span>Verification expired</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-gd-green text-sm">
      <ShieldCheck className="h-4 w-4" />
      <span>Verified human</span>
    </div>
  );
}

export function IdentityVerificationPrompt() {
  const { mutateAsync: generateLink, isPending } = useGenerateFVLink();
  const { data: identity } = useIdentityStatus();

  if (identity?.isWhitelisted) return null;

  const handleVerify = async () => {
    const callbackUrl = `${window.location.origin}/verify/callback`;
    const link = await generateLink(callbackUrl);
    window.location.href = link;
  };

  return (
    <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-orange-300">Identity verification required</p>
          <p className="text-xs text-gd-muted mt-1">
            GoodFlow uses GoodDollar Face Verification to ensure one-human-one-account.
          </p>
          <button
            onClick={handleVerify}
            disabled={isPending}
            className={cn(
              "mt-3 rounded-lg bg-gd-green px-4 py-1.5 text-sm font-medium text-black",
              "hover:bg-green-400 transition-colors disabled:opacity-50"
            )}
          >
            {isPending ? "Generating link…" : "Verify my identity"}
          </button>
        </div>
      </div>
    </div>
  );
}
