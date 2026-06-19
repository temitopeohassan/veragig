"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { ProfileForm } from "@/components/ProfileForm";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";

export default function EditProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { data: profile, isLoading } = useProfile(address);
  const { mutateAsync: updateProfile, isPending, error } = useUpdateProfile();

  if (!isConnected || !address) {
    return (
      <ConnectPrompt
        title="Update your profile"
        description="Connect your wallet to update your profile."
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
        <h1 className="text-2xl font-bold">No profile to update</h1>
        <p className="text-gd-muted">Create a profile first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Update your profile</h1>
        <p className="text-gd-muted text-sm mt-1">
          Edit your details. You&apos;ll sign a message to confirm the change.
        </p>
      </div>

      <ProfileForm
        address={address}
        initial={profile}
        onSubmit={async (values) => {
          await updateProfile(values);
          router.push("/profile");
        }}
        isPending={isPending}
        submitLabel="Save changes"
        pendingLabel="Saving changes…"
        error={error ? (error as Error).message : null}
      />
    </div>
  );
}
