import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, TrendingUp, Banknote } from "lucide-react";
import { StatsSection } from "@/components/StatsSection";

export default function LandingPage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="text-center py-20 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-gd-green/30 bg-gd-green/10 px-4 py-1.5 text-sm text-gd-green">
          <span className="h-2 w-2 rounded-full bg-gd-green animate-pulse" />
          Live on Celo Mainnet
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
          Earn, build credit,{" "}
          <span className="text-gd-green">get paid in G$</span>
        </h1>

        <p className="text-xl text-gd-muted max-w-2xl mx-auto">
          VeraGig is a gig marketplace for verified humans. Complete tasks, earn G$ via Superfluid
          streams, and unlock micro-loans based on your on-chain VeraScore.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/tasks"
            className="flex items-center gap-2 rounded-xl bg-gd-green px-6 py-3 font-medium text-black hover:bg-green-400 transition-colors"
          >
            Browse tasks <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/post-task"
            className="rounded-xl border border-gd-border px-6 py-3 font-medium text-gd-text hover:border-gd-green/50 transition-colors"
          >
            Post a task
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: ShieldCheck,
            title: "Sybil-resistant",
            desc: "Every user verified via GoodDollar Face Verification — one human, one account.",
          },
          {
            icon: Zap,
            title: "Real-time payments",
            desc: "Earnings stream per second to your wallet via Superfluid CFAv1Forwarder.",
          },
          {
            icon: TrendingUp,
            title: "VeraScore",
            desc: "Build an on-chain credit score from task history, UBI claims, and loan repayments.",
          },
          {
            icon: Banknote,
            title: "Micro-loans",
            desc: "Score-gated loans up to 500 G$ with automatic repayment from task earnings.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-gd-border bg-gd-card p-6 space-y-3">
            <f.icon className="h-6 w-6 text-gd-green" />
            <h3 className="font-semibold text-gd-text">{f.title}</h3>
            <p className="text-sm text-gd-muted">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Stats */}
      <StatsSection />
    </div>
  );
}
