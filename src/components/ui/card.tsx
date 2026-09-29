import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all dark:shadow-none",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  icon,
  action,
  href,
  hrefLabel,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-border bg-surface-2/30 px-4 py-3 sm:px-5", className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
        {icon && <span className="text-primary [&_svg]:size-4">{icon}</span>}
        {title}
      </h2>
      {action}
      {href && (
        <Link href={href} className="shrink-0 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
          {hrefLabel ?? "Tümü"} →
        </Link>
      )}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}
