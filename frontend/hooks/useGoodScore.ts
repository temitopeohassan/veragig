"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { API_URL } from "@/lib/contracts";

export function useGoodScore(workerAddress?: string) {
  const { address } = useAccount();
  const target = workerAddress ?? address;

  return useQuery({
    queryKey: ["goodscore", target],
    enabled: !!target,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/score/${target}`);
      if (!res.ok) throw new Error("Failed to fetch score");
      return res.json() as Promise<{
        good_score: number;
        loan_tier: string;
        signals: {
          task_completion_rate: number;
          earnings_consistency_weeks: number;
          disputes_lost: number;
          ubi_claim_streak_days: number;
          loans_repaid_on_time: number;
        };
        last_updated_block: number;
      }>;
    },
    // Check once on page load; do not re-poll or refetch on focus/mount/reconnect.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export function useCreditNarrative() {
  const { address } = useAccount();
  const { data: scoreData } = useGoodScore();

  return useQuery({
    queryKey: ["credit-narrative", address],
    enabled: !!address && !!scoreData,
    queryFn: async () => {
      if (!scoreData || !address) return null;
      const res = await fetch(`${API_URL}/ai/credit-narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_address: address,
          good_score: scoreData.good_score,
          signals: scoreData.signals,
          loan_tier: scoreData.loan_tier,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate narrative");
      return res.json() as Promise<{
        narrative: string;
        top_improvement_actions: string[];
      }>;
    },
    staleTime: 300_000,
  });
}
