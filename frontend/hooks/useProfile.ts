"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage, useWriteContract, usePublicClient } from "wagmi";
import { API_URL, CONTRACTS } from "@/lib/contracts";
import { createAuthPayload } from "@/lib/authSign";
import AccountABI from "@/abis/Account.json";

export interface Profile {
  address: string;
  first_name: string;
  last_name: string;
  email: string;
  account_tx_hash?: string | null;
}

export interface ProfileInput {
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Fetch the connected (or given) wallet's profile.
 * Resolves to `null` when no profile exists (HTTP 404) — used to gate the
 * create-profile modal and connect-time redirect.
 */
export function useProfile(address?: string) {
  return useQuery<Profile | null>({
    queryKey: ["profile", address?.toLowerCase()],
    enabled: !!address,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/profiles/${address}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    staleTime: 30_000,
  });
}

// Create a profile: register on-chain via Account.createAccount(), prove wallet
// ownership with a signed message, then persist the record in the database.
export function useCreateProfile() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      if (!address) throw new Error("Wallet not connected");

      // 1. On-chain account record (user signs + pays gas from their own wallet).
      //    Skip if the wallet is already registered on-chain — otherwise
      //    Account.createAccount() reverts with "Account exists". This happens
      //    when a prior attempt registered on-chain but the DB write below
      //    failed/was abandoned, leaving the wallet registered but profile-less.
      //    Re-running create then must be able to recover instead of dead-ending.
      let txHash: `0x${string}` | null = null;
      const alreadyRegistered = (await publicClient?.readContract({
        address: CONTRACTS.ACCOUNT,
        abi: AccountABI,
        functionName: "exists",
        args: [address],
      })) as boolean | undefined;

      if (!alreadyRegistered) {
        txHash = await writeContractAsync({
          address: CONTRACTS.ACCOUNT,
          abi: AccountABI,
          functionName: "createAccount",
          args: [],
        });
        await publicClient?.waitForTransactionReceipt({ hash: txHash });
      }

      // 2. Prove wallet ownership for the database write.
      const auth = await createAuthPayload(signMessageAsync, {
        action: "create-profile",
        subject: address,
        address,
      });

      // 3. Persist the profile.
      const res = await fetch(`${API_URL}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          account_tx_hash: txHash,
          ...auth,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to create profile");
      }
      return res.json() as Promise<Profile>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", address?.toLowerCase()] });
    },
  });
}

// Update the profile's first/last/email in the database (no on-chain change).
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      if (!address) throw new Error("Wallet not connected");

      const auth = await createAuthPayload(signMessageAsync, {
        action: "update-profile",
        subject: address,
        address,
      });

      const res = await fetch(`${API_URL}/profiles/${address}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          ...auth,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to update profile");
      }
      return res.json() as Promise<Profile>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", address?.toLowerCase()] });
    },
  });
}
