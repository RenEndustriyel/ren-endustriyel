import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)} {...props} />;
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
    <div className={cn("flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5", className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
        {icon && <span className="text-primary [&_svg]:size-4">{icon}</span>}
        {title}
      </h2>
      {action}
      {href && (
        <Link href={href} className="shrink-0 text-xs font-medium text-muted hover:text-primary">
          {hrefLabel ?? "Tümü"} →
        </Link>
      )}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}
