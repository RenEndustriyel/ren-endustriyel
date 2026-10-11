"use client";

import * as React from "react";
import { DialogContent } from "./dialog";
import { cn } from "@/lib/utils";

/** Geniş form penceresi (telefonda alttan tam sayfa) */
export function WideDialogContent({ className, ...props }: React.ComponentProps<typeof DialogContent>) {
  return <DialogContent className={cn("sm:max-w-2xl", className)} {...props} />;
}
