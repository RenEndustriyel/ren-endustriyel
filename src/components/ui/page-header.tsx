"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: boolean | string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-3", className)}>
      {back && (
        <button
          onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
          className="rounded-lg p-2 text-muted hover:bg-surface hover:text-text"
          aria-label="Geri"
        >
          <ArrowLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold sm:text-xl">{title}</h2>
        {description && <div className="text-sm text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
