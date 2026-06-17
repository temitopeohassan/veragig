"use client";

import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/contracts";

export interface PlatformStats {
  tasks_posted: number;
  g_streamed_wei: string;
  verified_workers: number;
}

export function useStats() {
  return useQuery<PlatformStats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/stats`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 60_000,
  });
}
