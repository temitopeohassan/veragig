"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Suspense } from "react";

function VerifyCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const result = searchParams.get("result");

    if (result === "success" || !result) {
      // GoodDollar redirects back — invalidate identity cache
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["identity"] });
        queryClient.invalidateQueries({ queryKey: ["identity-expiry"] });
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 2500);
      }, 1500);
    } else {
      setStatus("error");
    }
  }, [searchParams, queryClient, router]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="h-16 w-16 text-gd-green animate-spin" />
          <h2 className="text-xl font-bold">Verifying your identity…</h2>
          <p className="text-gd-muted">Checking GoodDollar Face Verification status</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="h-16 w-16 text-gd-green" />
          <h2 className="text-xl font-bold">Identity verified!</h2>
          <p className="text-gd-muted">You are now a verified human on GoodFlow. Redirecting…</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="h-16 w-16 text-red-400" />
          <h2 className="text-xl font-bold">Verification failed</h2>
          <p className="text-gd-muted">Please try again or contact support.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-gd-card border border-gd-border px-6 py-2.5 text-sm font-medium hover:border-gd-green/50 transition-colors"
          >
            Back to Dashboard
          </button>
        </>
      )}
    </div>
  );
}

export default function VerifyCallbackPage() {
  return (
    <Suspense>
      <VerifyCallbackContent />
    </Suspense>
  );
}
