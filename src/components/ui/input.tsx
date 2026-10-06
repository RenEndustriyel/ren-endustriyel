import * as React from "react";
import { cn } from "@/lib/utils";
import { DateInput } from "./date-input";

export const inputClass =
  "flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 aria-invalid:border-danger";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  // Tarih kutuları her tarayıcıda GG/AA/YYYY görünsün
  if (props.type === "date") return <DateInput className={cn(inputClass, className)} {...props} />;
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "h-auto min-h-20 py-2", className)} {...props} />;
}

export function NativeSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}
