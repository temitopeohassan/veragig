"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useIdentitySDK } from "@goodsdks/citizen-sdk";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { GOODFLOW_ENV, CONTRACTS } from "@/lib/contracts";

export function useIdentityStatus() {
  const { address } = useAccount();
  const identitySDK = useIdentitySDK(GOODFLOW_ENV);

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
  const identitySDK = useIdentitySDK(GOODFLOW_ENV);

  return useQuery({
    queryKey: ["identity-expiry", address],
    enabled: !!address && !!identitySDK,
    queryFn: async () => {
      if (!address || !identitySDK) return null;
      const expiryData = await identitySDK.getIdentityExpiryData(address);
      return identitySDK.calculateIdentityExpiry(
        expiryData.lastAuthenticated,
        expiryData.authPeriod
      );
    },
    staleTime: 300_000,
  });
}

export function useGenerateFVLink() {
  const identitySDK = useIdentitySDK(GOODFLOW_ENV);

  return useMutation({
    mutationFn: async (callbackUrl: string) => {
      if (!identitySDK) throw new Error("SDK not initialized");
      return identitySDK.generateFVLink(false, callbackUrl, 42220);
    },
  });
}
