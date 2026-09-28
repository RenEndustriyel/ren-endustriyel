"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, type Tables } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import { useLocalStorage } from "@/lib/use-local-storage";

export type Role = "owner" | "admin" | "staff" | "accountant";
export type Organization = Tables<"organizations">;
export type MembershipWithOrg = { role: Role; organization: Organization };

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Sahip",
  admin: "Yönetici",
  staff: "Personel",
  accountant: "Muhasebeci",
};

type OrgState = {
  memberships: MembershipWithOrg[];
  org: Organization | null;
  role: Role | null;
  loading: boolean;
  canWrite: boolean;
  isAdmin: boolean;
  switchOrg: (id: string) => void;
  refresh: () => Promise<void>;
};

const OrgContext = React.createContext<OrgState | null>(null);
const STORAGE_KEY = "ren-current-org";

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentId, setCurrentId] = useLocalStorage(STORAGE_KEY);

  const query = useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("role, organization:organizations(*)")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).filter((m) => m.organization) as unknown as MembershipWithOrg[];
    },
  });

  const memberships = React.useMemo(() => query.data ?? [], [query.data]);
  const current = memberships.find((m) => m.organization.id === currentId) ?? memberships[0] ?? null;

  const switchOrg = React.useCallback((id: string) => setCurrentId(id), [setCurrentId]);

  const refresh = React.useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["memberships"] });
  }, [qc]);

  const role = current?.role ?? null;
  const value: OrgState = {
    memberships,
    org: current?.organization ?? null,
    role,
    loading: query.isPending && !!user,
    canWrite: role === "owner" || role === "admin" || role === "staff",
    isAdmin: role === "owner" || role === "admin",
    switchOrg,
    refresh,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = React.useContext(OrgContext);
  if (!ctx) throw new Error("useOrg, OrgProvider içinde kullanılmalı");
  return ctx;
}

/** Seçili firmanın kimliği (firma seçilmeden çağrılmamalı) */
export function useOrgId(): string {
  const { org } = useOrg();
  if (!org) throw new Error("Firma seçili değil");
  return org.id;
}
