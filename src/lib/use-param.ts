"use client";

import { useSearchParams } from "next/navigation";

/** URL sorgu parametresi (?id=...) */
export function useParam(name: string): string | null {
  return useSearchParams().get(name);
}
