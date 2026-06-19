"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWriteContract, useSignMessage } from "wagmi";
import { parseUnits, keccak256, encodePacked } from "viem";
import { API_URL, CONTRACTS } from "@/lib/contracts";
import { createAuthPayload } from "@/lib/authSign";
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
  const { signMessageAsync } = useSignMessage();

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

      // The client approves the escrow contract for reward + fee from their own wallet.
      // The on-chain createTask itself is then submitted by the backend trusted relayer.
      await writeContractAsync({
        address: CONTRACTS.G_DOLLAR,
        abi: ERC20ABI,
        functionName: "approve",
        args: [CONTRACTS.ESCROW, totalWei],
      });

      // Prove wallet ownership so the relayer will act on the client's behalf.
      const auth = await createAuthPayload(signMessageAsync, {
        action: "create-task",
        subject: taskId,
        address: address!,
      });

      // Backend relayer creates + funds the task on-chain (pulling the approved G$),
      // then persists it. Returns the escrow tx hash.
      const res = await fetch(`${API_URL}/tasks`, {
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
          ...auth,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to create task");
      }
      const data = await res.json();

      return { taskId, txHash: data.escrow_tx_hash as string | undefined };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// Approve a submitted task; the backend relayer releases the reward to the worker.
export function useApproveAndRelease() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  return useMutation({
    mutationFn: async (params: { taskId: string; rating: number }) => {
      const auth = await createAuthPayload(signMessageAsync, {
        action: "approve-task",
        subject: params.taskId,
        address: address!,
      });
      const res = await fetch(`${API_URL}/tasks/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: params.taskId,
          client_address: address,
          rating: params.rating,
          ...auth,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to approve task");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", vars.taskId] });
    },
  });
}

// Cancel an open task; the backend relayer refunds the client.
export function useCancelTask() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  return useMutation({
    mutationFn: async (params: { taskId: string }) => {
      const auth = await createAuthPayload(signMessageAsync, {
        action: "cancel-task",
        subject: params.taskId,
        address: address!,
      });
      const res = await fetch(`${API_URL}/tasks/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: params.taskId,
          client_address: address,
          ...auth,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to cancel task");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", vars.taskId] });
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
