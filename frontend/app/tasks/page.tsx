"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "@/components/TaskCard";
import { Loader2, Search } from "lucide-react";

const CATEGORIES = ["all", "design", "development", "writing", "marketing", "data", "video", "audio", "other"];

export default function TasksPage() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { data: tasks, isLoading } = useTasks("open", category === "all" ? undefined : category);

  const filtered = tasks?.filter((t: any) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Browse Tasks</h1>
        <span className="text-sm text-gd-muted">{filtered?.length ?? 0} open tasks</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gd-muted" />
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-gd-card border border-gd-border pl-9 pr-4 py-2.5 text-sm text-gd-text placeholder:text-gd-muted focus:outline-none focus:border-gd-green"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === "all" ? undefined : cat)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors capitalize ${
                (category ?? "all") === cat
                  ? "bg-gd-green text-black"
                  : "bg-gd-card border border-gd-border text-gd-muted hover:text-gd-text"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gd-muted" />
        </div>
      ) : !filtered?.length ? (
        <div className="text-center py-20 text-gd-muted">
          <p className="text-lg">No open tasks found</p>
          <p className="text-sm mt-2">Be the first to post one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task: any) => (
            <TaskCard key={task.task_id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
