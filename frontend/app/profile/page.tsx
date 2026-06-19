"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { Loader2, Pencil } from "lucide-react";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { useProfile } from "@/hooks/useProfile";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gd-muted">{label}</p>
      <p className="mt-1 text-gd-text break-all">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: profile, isLoading } = useProfile(address);

  if (!isConnected || !address) {
    return (
      <ConnectPrompt
        title="Your profile"
        description="Connect your wallet to view your profile."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gd-green" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold">No profile yet</h1>
        <p className="text-gd-muted">You haven&apos;t created a profile for this wallet.</p>
        <Link
          href="/profile/create"
          className="inline-block rounded-xl bg-gd-green px-6 py-3 font-medium text-black hover:bg-green-400 transition-colors"
        >
          Create profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <Link
          href="/profile/edit"
          className="flex items-center gap-2 rounded-lg border border-gd-border px-4 py-2 text-sm text-gd-muted hover:text-gd-text hover:border-gd-green transition-colors"
        >
          <Pencil className="h-4 w-4" /> Edit
        </Link>
      </div>

      <div className="rounded-xl border border-gd-border bg-gd-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="First Name" value={profile.first_name} />
        <Field label="Last Name" value={profile.last_name} />
        <Field label="Email address" value={profile.email} />
        <Field label="Connected wallet" value={profile.address} />
      </div>
    </div>
  );
}
