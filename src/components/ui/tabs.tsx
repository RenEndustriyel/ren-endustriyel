"use client";

import * as React from "react";
import { Tabs as T } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn("thin-scroll flex gap-1 overflow-x-auto border-b border-border", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "-mb-px shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text data-[state=active]:border-primary data-[state=active]:text-primary",
        className,
      )}
      {...props}
    />
  );
}
