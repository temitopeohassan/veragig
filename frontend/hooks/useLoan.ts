"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { API_URL } from "@/lib/contracts";

export function useLoanEligibility() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["loan-eligibility", address],
    enabled: !!address,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/loans/${address}/eligibility`);
      if (!res.ok) throw new Error("Failed to check eligibility");
      return res.json() as Promise<{
        is_eligible: boolean;
        max_loan_g_dollar: string;
        good_score: number;
        loan_tier: string;
        repayment_deduction_pct: number;
        reason_if_ineligible: string | null;
      }>;
    },
    // Check once on page load; do not re-poll or refetch on focus/mount/reconnect.
    // A successful loan request explicitly invalidates this query to refresh it.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export function useRequestLoan() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (params: { requestedAmountGDollar: string; purpose: string }) => {
      // Backend triggers on-chain loan request via backend signer
      const res = await fetch(`${API_URL}/loans/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_address: address,
          requested_amount_g_dollar: params.requestedAmountGDollar,
          purpose: params.purpose,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Loan request failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-eligibility", address] });
      queryClient.invalidateQueries({ queryKey: ["goodscore", address] });
    },
  });
}
