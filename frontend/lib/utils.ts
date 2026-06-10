import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGDollar(wei: bigint | string, decimals = 2): string {
  const amount = typeof wei === "string" ? BigInt(wei) : wei;
  return Number(formatUnits(amount, 18)).toFixed(decimals);
}

export function perMonthToFlowRate(amountPerMonth: string): bigint {
  return (BigInt(amountPerMonth) * 10n ** 18n) / 2592000n;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function loanTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    none: "No tier",
    starter: "Starter (up to 50 G$)",
    builder: "Builder (up to 200 G$)",
    prime: "Prime (up to 500 G$)",
  };
  return labels[tier] ?? tier;
}

export function scoreColor(score: number): string {
  if (score >= 700) return "text-green-400";
  if (score >= 500) return "text-yellow-400";
  if (score >= 300) return "text-orange-400";
  return "text-red-400";
}
