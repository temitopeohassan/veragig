"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { IdentitySDK } from "@goodsdks/citizen-sdk";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { VERAGIG_ENV } from "@/lib/contracts";

// citizen-sdk v1.2.5 replaced the `useIdentitySDK` hook with an async
// `IdentitySDK.init({ publicClient, walletClient, env })` class API. This
// local hook reconstructs an instance from the connected wagmi clients.
export function useIdentitySDK() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const { data: identitySDK } = useQuery({
    queryKey: ["identity-sdk", walletClient?.account?.address, publicClient?.chain?.id],
    enabled: !!publicClient && !!walletClient,
    queryFn: () => {
      if (!publicClient || !walletClient) return null;
      return IdentitySDK.init({ publicClient, walletClient, env: VERAGIG_ENV });
    },
    staleTime: Infinity,
  });

  return identitySDK ?? null;
}

export function useIdentityStatus() {
  const { address } = useAccount();
  const identitySDK = useIdentitySDK();

  return useQuery({
    queryKey: ["identity", address],
    enabled: !!address && !!identitySDK,
    queryFn: async () => {
      if (!address || !identitySDK) return null;
      const { isWhitelisted, root } = await identitySDK.getWhitelistedRoot(address);
      return { isWhitelisted, root };
    },
    staleTime: 60_000,
  });
}

export function useIdentityExpiry() {
  const { address } = useAccount();
  const identitySDK = useIdentitySDK();

  return useQuery({
    queryKey: ["identity-expiry", address],
    enabled: !!address && !!identitySDK,
    queryFn: async () => {
      if (!address || !identitySDK) return null;
      const expiryData = await identitySDK.getIdentityExpiryData(address);
      // v1.2.5's IdentityExpiry only carries expiryTimestamp; derive isExpired here.
      const { expiryTimestamp, formattedExpiryTimestamp } = identitySDK.calculateIdentityExpiry(
        expiryData.lastAuthenticated,
        expiryData.authPeriod
      );
      const isExpired = expiryTimestamp <= BigInt(Math.floor(Date.now() / 1000));
      return { expiryTimestamp, formattedExpiryTimestamp, isExpired };
    },
    staleTime: 300_000,
  });
}

export function useGenerateFVLink() {
  const identitySDK = useIdentitySDK();

  return useMutation({
    mutationFn: async (callbackUrl: string) => {
      if (!identitySDK) throw new Error("SDK not initialized");
      return identitySDK.generateFVLink(false, callbackUrl, 42220);
    },
  });
}
