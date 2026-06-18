"use client";

import { useAccount } from "wagmi";
import { GoodScoreWidget } from "@/components/GoodScoreWidget";
import { UBIClaimWidget } from "@/components/UBIClaim";
import { LoanWidget } from "@/components/LoanWidget";
import { IdentityVerificationPrompt } from "@/components/IdentityVerification";
import { useIdentityStatus } from "@/hooks/useIdentity";
import { shortenAddress } from "@/lib/utils";
import { ConnectPrompt } from "@/components/ConnectPrompt";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: identity } = useIdentityStatus();

  if (!isConnected) {
    return (
      <ConnectPrompt
        title="Worker Dashboard"
        description="Connect your wallet to view your dashboard."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gd-muted text-sm mt-1">{shortenAddress(address!)}</p>
        </div>
      </div>

      {!identity?.isWhitelisted && <IdentityVerificationPrompt />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GoodScoreWidget />
        <UBIClaimWidget />
        <LoanWidget />
      </div>
    </div>
  );
}
