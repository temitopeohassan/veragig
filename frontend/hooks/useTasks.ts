"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWriteContract, useSignMessage } from "wagmi";
import { parseUnits, keccak256, encodePacked } from "viem";
import { API_URL, CONTRACTS, getToken } from "@/lib/contracts";
import { createAuthPayload } from "@/lib/authSign";
import ERC20ABI from "@/abis/ERC20.json";

export type TaskType = "gig" | "bounty";

export interface TaskSubmission {
  id: string;
  task_id: string;
  worker_address: string;
  deliverable_cid: string | null;
  notes: string | null;
  status: "pending" | "accepted" | "rejected";
}

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
      rewardAmount: string;
      tokenSymbol: string;
      taskType: TaskType;
      deadlineUnix: number;
      releaseAsStream: boolean;
      payoutDurationDays: number;
    }) => {
      const token = getToken(params.tokenSymbol);
      // Reward is denominated in the chosen token's own decimals (USDT = 6, G$/CELO = 18).
      const rewardWei = parseUnits(params.rewardAmount, token.decimals);
      const feeWei = (rewardWei * 200n) / 10000n;
      const totalWei = rewardWei + feeWei;

      const taskId = keccak256(
        encodePacked(
          ["address", "string", "uint256"],
          [address!, params.title, BigInt(Date.now())]
        )
      );

      // The client approves the escrow contract for reward + fee in the chosen token
      // from their own wallet. The on-chain createTask is then submitted by the relayer.
      await writeContractAsync({
        address: token.address,
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

      // Backend relayer creates + funds the task on-chain (pulling the approved token),
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
          token: token.symbol,
          task_type: params.taskType,
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

// List all submissions for a bounty (used by the client's winner-selection page).
export function useTaskSubmissions(taskId: string, enabled = true) {
  return useQuery<TaskSubmission[]>({
    queryKey: ["task-submissions", taskId],
    enabled: !!taskId && enabled,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tasks/${taskId}/submissions`);
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
  });
}

// Submit (or resubmit) work to an open bounty. Any verified worker may submit.
export function useSubmitWork() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (params: { taskId: string; deliverableCid: string; notes?: string }) => {
      const res = await fetch(`${API_URL}/tasks/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: params.taskId,
          worker_address: address,
          deliverable_cid: params.deliverableCid,
          notes: params.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to submit work");
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["task-submissions", vars.taskId] });
    },
  });
}

// Client selects winning submissions; the relayer splits the reward equally between them.
export function useSelectWinners() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  return useMutation({
    mutationFn: async (params: { taskId: string; submissionIds: string[]; rating: number }) => {
      const auth = await createAuthPayload(signMessageAsync, {
        action: "select-winners",
        subject: params.taskId,
        address: address!,
      });
      const res = await fetch(`${API_URL}/tasks/select-winners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: params.taskId,
          client_address: address,
          submission_ids: params.submissionIds,
          rating: params.rating,
          ...auth,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to select winners");
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", vars.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-submissions", vars.taskId] });
    },
  });
}
