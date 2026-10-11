"use client";

import Link from "next/link";
import { QUICK_ACTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function QuickActionsGrid({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {QUICK_ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          onClick={onNavigate}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-3 text-center text-xs font-medium transition-colors hover:bg-surface-2"
        >
          <span className={cn("flex size-10 items-center justify-center rounded-full", a.tone)}>
            <a.icon className="size-5" />
          </span>
          {a.title}
        </Link>
      ))}
    </div>
  );
}
