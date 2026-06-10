"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import CFAv1ForwarderABI from "@/abis/CFAv1Forwarder.json";
import { perMonthToFlowRate } from "@/lib/utils";

export function useFlowInfo(sender?: string, receiver?: string) {
  return useQuery({
    queryKey: ["flow-info", sender, receiver],
    enabled: !!sender && !!receiver,
    queryFn: async () => {
      // Read flow info via The Graph or direct RPC
      const res = await fetch(
        `/api/stream/flow?sender=${sender}&receiver=${receiver}`
      );
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 10_000,
  });
}

export function useCreateFlow() {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: {
      sender: string;
      receiver: string;
      flowRatePerMonthGDollar: string;
      userData?: string;
    }) => {
      const flowRate = perMonthToFlowRate(params.flowRatePerMonthGDollar);
      const txHash = await writeContractAsync({
        address: CONTRACTS.CFA_FORWARDER,
        abi: CFAv1ForwarderABI,
        functionName: "createFlow",
        args: [
          CONTRACTS.G_DOLLAR,
          params.sender as `0x${string}`,
          params.receiver as `0x${string}`,
          flowRate,
          (params.userData ?? "0x") as `0x${string}`,
        ],
      });
      return { txHash, flowRateWeiPerSec: flowRate.toString() };
    },
  });
}

export function useDeleteFlow() {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { sender: string; receiver: string }) => {
      const txHash = await writeContractAsync({
        address: CONTRACTS.CFA_FORWARDER,
        abi: CFAv1ForwarderABI,
        functionName: "deleteFlow",
        args: [
          CONTRACTS.G_DOLLAR,
          params.sender as `0x${string}`,
          params.receiver as `0x${string}`,
          "0x" as `0x${string}`,
        ],
      });
      return { txHash };
    },
  });
}
