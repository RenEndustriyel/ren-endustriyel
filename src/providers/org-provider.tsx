"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, type Tables } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import { useLocalStorage } from "@/lib/use-local-storage";

export type Role = "owner" | "admin" | "staff" | "accountant" | "b2b";
export type Organization = Tables<"organizations">;
export type MembershipWithOrg = { role: Role; organization: Organization };

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Sahip",
  admin: "Yönetici",
  staff: "Personel",
  accountant: "Muhasebeci",
  b2b: "B2B Müşteri / Bayi",
};

type OrgState = {
  memberships: MembershipWithOrg[];
  org: Organization | null;
  role: Role | null;
  loading: boolean;
  canWrite: boolean;
  isAdmin: boolean;
  isB2B: boolean;
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


  const org = current?.organization ?? null;
  const userEmail = user?.email?.toLowerCase().trim();
  const b2bEmailList: string[] = Array.isArray((org?.settings as any)?.b2b_emails)
    ? (org?.settings as any).b2b_emails.map((e: string) => String(e).toLowerCase().trim())
    : [];

  const isB2BUser =
    current?.role === "b2b" ||
    user?.user_metadata?.is_b2b === true ||
    user?.user_metadata?.role === "b2b" ||
    (!!userEmail && b2bEmailList.includes(userEmail));

  const role: Role | null = isB2BUser ? "b2b" : (current?.role ?? null);
  const canWrite = !isB2BUser && (role === "owner" || role === "admin" || role === "staff");
  const isAdmin = !isB2BUser && (role === "owner" || role === "admin");
  const isB2B = isB2BUser || role === "b2b";
  const loading = query.isPending && !!user;

  const value: OrgState = React.useMemo(
    () => ({
      memberships,
      org,
      role,
      loading,
      canWrite,
      isAdmin,
      isB2B,
      switchOrg,
      refresh,
    }),
    [memberships, org, role, loading, canWrite, isAdmin, isB2B, switchOrg, refresh],
  );

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
