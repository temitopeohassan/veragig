"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ProfileInput } from "@/hooks/useProfile";

const inputClass =
  "mt-1 w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green";

type ProfileFormProps = {
  address: string;
  initial?: Partial<ProfileInput>;
  onSubmit: (values: ProfileInput) => void;
  isPending: boolean;
  submitLabel: string;
  pendingLabel?: string;
  error?: string | null;
};

export function ProfileForm({
  address,
  initial,
  onSubmit,
  isPending,
  submitLabel,
  pendingLabel,
  error,
}: ProfileFormProps) {
  const [form, setForm] = useState<ProfileInput>({
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    email: initial?.email ?? "",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-5"
    >
      <div className="rounded-xl border border-gd-border bg-gd-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gd-muted">First Name</label>
            <input
              required
              maxLength={60}
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="Jane"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gd-muted">Last Name</label>
            <input
              required
              maxLength={60}
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="Doe"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gd-muted">Email address</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gd-muted">Connected wallet</label>
          <input
            readOnly
            value={address}
            className={`${inputClass} cursor-not-allowed opacity-70 font-mono`}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-gd-green py-3 font-medium text-black hover:bg-green-400 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {pendingLabel ?? "Saving…"}
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
