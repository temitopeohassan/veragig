"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, keccak256, encodePacked, toHex } from "viem";
import { API_URL, CONTRACTS } from "@/lib/contracts";
import VeraGigEscrowABI from "@/abis/VeraGigEscrow.json";
import ERC20ABI from "@/abis/ERC20.json";

export function useTasks(status = "open", category?: string) {
  return useQuery({
    queryKey: ["tasks", status, category],
    queryFn: async () => {
      const params = new URLSearchParams({ status });
      if (category) params.set("category", category);
      const res = await fetch(`${API_URL}/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ["task", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tasks/${taskId}`);
      if (!res.ok) throw new Error("Task not found");
      return res.json();
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      category: string;
      rewardGDollar: string;
      deadlineUnix: number;
      releaseAsStream: boolean;
      payoutDurationDays: number;
    }) => {
      const rewardWei = parseUnits(params.rewardGDollar, 18);
      const feeWei = (rewardWei * 200n) / 10000n;
      const totalWei = rewardWei + feeWei;

      const taskId = keccak256(
        encodePacked(
          ["address", "string", "uint256"],
          [address!, params.title, BigInt(Date.now())]
        )
      );

      // Approve G$ spend
      await writeContractAsync({
        address: CONTRACTS.G_DOLLAR,
        abi: ERC20ABI,
        functionName: "approve",
        args: [CONTRACTS.ESCROW, totalWei],
      });

      // Create task on-chain
      const txHash = await writeContractAsync({
        address: CONTRACTS.ESCROW,
        abi: VeraGigEscrowABI,
        functionName: "createTask",
        args: [taskId, rewardWei, BigInt(params.deadlineUnix), params.releaseAsStream, BigInt(params.payoutDurationDays)],
      });

      // Register in backend
      await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          title: params.title,
          description: params.description,
          category: params.category,
          reward_wei: rewardWei.toString(),
          deadline_unix: params.deadlineUnix,
          client_address: address,
          release_as_stream: params.releaseAsStream,
          payout_duration_days: params.payoutDurationDays,
          escrow_tx_hash: txHash,
        }),
      });

      return { taskId, txHash };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useApplyToTask() {
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (params: { taskId: string; proposal: string; estimatedDays?: number }) => {
      const res = await fetch(`${API_URL}/tasks/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: params.taskId,
          worker_address: address,
          proposal: params.proposal,
          estimated_days: params.estimatedDays,
        }),
      });
      if (!res.ok) throw new Error("Failed to apply");
      return res.json();
    },
  });
}
