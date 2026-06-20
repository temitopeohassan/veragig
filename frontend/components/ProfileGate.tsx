"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import { CreateProfileModal } from "@/components/CreateProfileModal";

const CREATE_ROUTE = "/profile/create";

// Drives the connect-time profile flow:
//  - a profiled wallet that connects is redirected to /dashboard
//  - a connected wallet with no profile gets a blocking create-profile modal
export function ProfileGate() {
  const { address, status, isConnected } = useAccount();
  const { data: profile, isLoading } = useProfile(address);
  const pathname = usePathname();
  const router = useRouter();

  // Distinguish a fresh user connect from an auto-reconnect on page load:
  // only redirect after we've actually observed a disconnected state.
  const sawDisconnected = useRef(false);
  // Track whether we were previously connected so an actual disconnect (not the
  // initial disconnected state on page load) redirects the user back home.
  const wasConnected = useRef(false);

  useEffect(() => {
    if (status === "disconnected") {
      sawDisconnected.current = true;
      if (wasConnected.current) {
        wasConnected.current = false;
        router.push("/");
      }
      return;
    }
    if (status === "connected") {
      wasConnected.current = true;
      if (sawDisconnected.current && profile) {
        sawDisconnected.current = false;
        router.push("/dashboard");
      }
    }
  }, [status, profile, router]);

  const needsProfile =
    isConnected && !isLoading && profile === null && pathname !== CREATE_ROUTE;

  return needsProfile ? <CreateProfileModal /> : null;
}
