"use client";

import { formatToken, cn } from "@/lib/utils";
import { Clock, Tag, Users } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface TaskCardProps {
  task: {
    task_id: string;
    title: string;
    category: string;
    reward_wei: string;
    token_symbol?: string;
    token_decimals?: number;
    task_type?: string;
    deadline_unix: number;
    client_address: string;
    status: string;
  };
}

const categoryColors: Record<string, string> = {
  design: "bg-purple-500/20 text-purple-400",
  development: "bg-blue-500/20 text-blue-400",
  writing: "bg-yellow-500/20 text-yellow-400",
  marketing: "bg-pink-500/20 text-pink-400",
  data: "bg-cyan-500/20 text-cyan-400",
  video: "bg-red-500/20 text-red-400",
  audio: "bg-orange-500/20 text-orange-400",
  other: "bg-gray-500/20 text-gray-400",
};

export function TaskCard({ task }: TaskCardProps) {
  const deadline = new Date(task.deadline_unix * 1000);
  const isExpired = deadline < new Date();

  return (
    <Link href={`/tasks/${task.task_id}`}>
      <div className="rounded-xl border border-gd-border bg-gd-card p-5 hover:border-gd-green/50 transition-colors cursor-pointer space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium text-gd-text line-clamp-2">{task.title}</h3>
          <span className="text-gd-green font-bold text-lg shrink-0 tabular-nums">
            {formatToken(task.reward_wei, task.token_decimals ?? 18)} {task.token_symbol ?? "G$"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              categoryColors[task.category] ?? categoryColors.other
            )}
          >
            <Tag className="h-3 w-3" />
            {task.category}
          </span>

          {task.task_type === "bounty" && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-gd-green/15 text-gd-green">
              <Users className="h-3 w-3" />
              Bounty
            </span>
          )}

          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              isExpired ? "text-red-400" : "text-gd-muted"
            )}
          >
            <Clock className="h-3 w-3" />
            {isExpired
              ? "Expired"
              : `Due ${formatDistanceToNow(deadline, { addSuffix: true })}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
