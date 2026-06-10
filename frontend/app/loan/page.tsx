"use client";

import { useAccount } from "wagmi";
import { LoanWidget } from "@/components/LoanWidget";
import { GoodScoreWidget } from "@/components/GoodScoreWidget";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Info } from "lucide-react";

export default function LoanPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <h1 className="text-2xl font-bold">Micro-Loans</h1>
        <p className="text-gd-muted">Connect your wallet to check loan eligibility.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Micro-Loans</h1>

      <div className="rounded-xl border border-gd-blue/30 bg-gd-blue/10 p-4 flex gap-3">
        <Info className="h-5 w-5 text-gd-blue shrink-0 mt-0.5" />
        <div className="text-sm text-gd-text space-y-1">
          <p className="font-medium">How GoodFlow loans work</p>
          <p className="text-gd-muted">
            Your GoodScore determines your loan tier and maximum amount. Repayment is automatically
            deducted from future task payouts — no manual payments needed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GoodScoreWidget />
        <LoanWidget />
      </div>

      {/* Tier table */}
      <div className="rounded-xl border border-gd-border bg-gd-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gd-border">
            <tr>
              <th className="px-4 py-3 text-left text-gd-muted font-medium">Tier</th>
              <th className="px-4 py-3 text-left text-gd-muted font-medium">Min Score</th>
              <th className="px-4 py-3 text-left text-gd-muted font-medium">Max Loan</th>
              <th className="px-4 py-3 text-left text-gd-muted font-medium">Repayment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gd-border">
            {[
              { tier: "Starter", score: 300, max: "50 G$", repayment: "30%" },
              { tier: "Builder", score: 500, max: "200 G$", repayment: "20%" },
              { tier: "Prime", score: 700, max: "500 G$", repayment: "15%" },
            ].map((row) => (
              <tr key={row.tier}>
                <td className="px-4 py-3 font-medium text-gd-text">{row.tier}</td>
                <td className="px-4 py-3 text-gd-muted">{row.score}+</td>
                <td className="px-4 py-3 text-gd-green font-medium">{row.max}</td>
                <td className="px-4 py-3 text-gd-muted">{row.repayment} of each payout</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
