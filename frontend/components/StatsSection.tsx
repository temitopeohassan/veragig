"use client";

import { useStats } from "@/hooks/useStats";
import { formatGDollar } from "@/lib/utils";

export function StatsSection() {
  const { data, isLoading, isError } = useStats();

  const placeholder = isLoading ? "…" : "—";

  const stats = [
    {
      label: "Tasks posted",
      value: data ? data.tasks_posted.toLocaleString() : placeholder,
    },
    {
      label: "G$ streamed",
      value:
        data && !isError
          ? Number(formatGDollar(data.g_streamed_wei, 0)).toLocaleString()
          : placeholder,
    },
    {
      label: "Verified workers",
      value: data ? data.verified_workers.toLocaleString() : placeholder,
    },
  ];

  return (
    <section className="rounded-2xl border border-gd-border bg-gd-card p-8">
      <div className="grid grid-cols-3 gap-8 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-3xl font-bold text-gd-green">{s.value}</p>
            <p className="text-sm text-gd-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
