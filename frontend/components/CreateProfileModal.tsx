"use client";

import { useRouter } from "next/navigation";
import { useDisconnect } from "wagmi";
import { UserPlus } from "lucide-react";

// Blocking overlay shown when a connected wallet has no profile. There is no
// dismiss button — the only ways forward are to create a profile or disconnect.
export function CreateProfileModal() {
  const router = useRouter();
  const { disconnect } = useDisconnect();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gd-border bg-gd-card p-6 space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gd-green/15">
          <UserPlus className="h-6 w-6 text-gd-green" />
        </div>
        <h2 className="text-xl font-bold">Create your profile</h2>
        <p className="text-sm text-gd-muted">
          This wallet doesn&apos;t have a VeraGig profile yet. Create one to access the
          marketplace, tasks, and loans.
        </p>
        <button
          onClick={() => router.push("/profile/create")}
          className="w-full rounded-xl bg-gd-green py-3 font-medium text-black hover:bg-green-400 transition-colors"
        >
          Create profile
        </button>
        <button
          onClick={() => disconnect()}
          className="w-full rounded-xl border border-gd-border py-2.5 text-sm text-gd-muted hover:text-gd-text transition-colors"
        >
          Disconnect wallet
        </button>
      </div>
    </div>
  );
}
