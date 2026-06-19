"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProfileForm } from "@/components/ProfileForm";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { useProfile, useCreateProfile } from "@/hooks/useProfile";

export default function CreateProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { data: profile } = useProfile(address);
  const { mutateAsync: createProfile, isPending, error } = useCreateProfile();

  // If a profile already exists, there is nothing to create.
  useEffect(() => {
    if (profile) router.replace("/profile");
  }, [profile, router]);

  if (!isConnected || !address) {
    return (
      <ConnectPrompt
        title="Create your profile"
        description="Connect your wallet to create a VeraGig profile."
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create your profile</h1>
        <p className="text-gd-muted text-sm mt-1">
          Creating a profile registers your wallet on-chain (one signature + gas) and
          then saves your details. You&apos;ll sign a second message to confirm ownership.
        </p>
      </div>

      <ProfileForm
        address={address}
        onSubmit={async (values) => {
          await createProfile(values);
          router.push("/dashboard");
        }}
        isPending={isPending}
        submitLabel="Create profile"
        pendingLabel="Creating profile…"
        error={error ? (error as Error).message : null}
      />
    </div>
  );
}
