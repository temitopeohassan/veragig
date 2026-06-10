"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ClaimSDK, useIdentitySDK } from "@goodsdks/citizen-sdk";
import { VERAGIG_ENV } from "@/lib/contracts";
import { formatUnits } from "viem";

function useClaimSDK() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const identitySDK = useIdentitySDK(VERAGIG_ENV);

  if (!address || !publicClient || !walletClient || !identitySDK) return null;

  return new ClaimSDK({
    account: address,
    publicClient: publicClient as any,
    walletClient: walletClient as any,
    identitySDK,
    env: VERAGIG_ENV,
  });
}

export function useUBIEntitlement() {
  const { address } = useAccount();
  const claimSDK = useClaimSDK();

  return useQuery({
    queryKey: ["ubi-entitlement", address],
    enabled: !!address && !!claimSDK,
    queryFn: async () => {
      if (!claimSDK) return null;
      const entitlement = await claimSDK.checkEntitlement();
      return {
        entitlementWei: entitlement.toString(),
        entitlementGDollar: Number(formatUnits(entitlement, 18)).toFixed(2),
        canClaim: entitlement > 0n,
      };
    },
    refetchInterval: 30_000,
  });
}

export function useNextClaimTime() {
  const { address } = useAccount();
  const claimSDK = useClaimSDK();

  return useQuery({
    queryKey: ["next-claim-time", address],
    enabled: !!address && !!claimSDK,
    queryFn: async () => {
      if (!claimSDK) return null;
      const nextTime = await claimSDK.nextClaimTime();
      const secondsUntil = Math.max(0, Math.floor((nextTime.getTime() - Date.now()) / 1000));
      return { nextClaimTime: nextTime.toISOString(), secondsUntilClaim: secondsUntil };
    },
    refetchInterval: 60_000,
  });
}

export function useClaimUBI() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const claimSDK = useClaimSDK();

  return useMutation({
    mutationFn: async () => {
      if (!claimSDK) throw new Error("SDK not initialized");
      const receipt = await claimSDK.claim();
      return { txHash: receipt.transactionHash };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ubi-entitlement", address] });
      queryClient.invalidateQueries({ queryKey: ["next-claim-time", address] });
    },
  });
}
