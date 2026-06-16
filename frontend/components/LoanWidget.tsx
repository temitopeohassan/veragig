"use client";

import { useLoanEligibility, useRequestLoan } from "@/hooks/useLoan";
import { useAccount } from "wagmi";
import { Banknote, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { loanTierLabel, cn } from "@/lib/utils";
import { useState } from "react";

const LOAN_PURPOSES = [
  { value: "working_capital", label: "Working capital" },
  { value: "equipment", label: "Equipment" },
  { value: "education", label: "Education" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
];

export function LoanWidget() {
  const { address } = useAccount();
  const { data: eligibility, isLoading } = useLoanEligibility();
  const { mutateAsync: requestLoan, isPending } = useRequestLoan();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("working_capital");
  const [success, setSuccess] = useState(false);

  if (!address) return null;

  const handleRequest = async () => {
    if (!amount) return;
    await requestLoan({ requestedAmountGDollar: amount, purpose });
    setSuccess(true);
    setAmount("");
  };

  return (
    <div className="rounded-xl border border-gd-border bg-gd-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gd-muted">Micro-Loan</h3>
        <Banknote className="h-4 w-4 text-gd-muted" />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gd-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Checking eligibility…</span>
        </div>
      ) : !eligibility?.is_eligible ? (
        <div className="flex items-start gap-2 text-red-400">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Not eligible</p>
            <p className="text-xs text-gd-muted mt-0.5">
              {eligibility?.reason_if_ineligible === "INSUFFICIENT_GOOD_SCORE"
                ? "Build your VeraScore to at least 300 to unlock the Starter tier."
                : eligibility?.reason_if_ineligible}
            </p>
          </div>
        </div>
      ) : success ? (
        <div className="flex items-center gap-2 text-gd-green">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Loan approved and disbursed!</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gd-muted">
              Tier: <span className="text-gd-text font-medium">{loanTierLabel(eligibility.loan_tier)}</span>
            </p>
            <p className="text-xs text-gd-muted">
              Max: <span className="text-gd-green font-medium">{eligibility.max_loan_g_dollar} G$</span>
            </p>
            <p className="text-xs text-gd-muted">
              Repayment: <span className="text-gd-text font-medium">{eligibility.repayment_deduction_pct}% of each task payout</span>
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Amount (max ${eligibility.max_loan_g_dollar} G$)`}
              max={eligibility.max_loan_g_dollar}
              className="w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green"
            />
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full rounded-lg bg-gd-dark border border-gd-border px-3 py-2 text-sm text-gd-text focus:outline-none focus:border-gd-green"
            >
              {LOAN_PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <button
              onClick={handleRequest}
              disabled={isPending || !amount}
              className="w-full rounded-lg bg-gd-blue py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                </span>
              ) : (
                "Request loan"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
