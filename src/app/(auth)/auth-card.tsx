import * as React from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">{children}</div>
      {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
