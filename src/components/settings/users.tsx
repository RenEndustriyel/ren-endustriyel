"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useOrg, ROLE_LABELS, type Role } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_HELP: Record<Role, string> = {
  owner: "Tüm yetkiler",
  admin: "Tüm yetkiler (sahiplik hariç)",
  staff: "Kayıt girer; kasa bakiyeleri, raporlar ve ayarlar kapalı",
  accountant: "Salt okunur; raporları görür ve dışa aktarır",
};

export function UsersSettings() {
  const { org, isAdmin, role: myRole } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("staff");
  const [inviting, setInviting] = React.useState(false);

  const members = useQuery({
    queryKey: ["members", org!.id],
    queryFn: async () => {
      const { data: ms, error } = await supabase.from("memberships").select("user_id, role, created_at").eq("org_id", org!.id);
      if (error) throw error;
      const { data: ps } = await supabase.from("profiles").select("id, email, full_name").in("id", ms.map((m) => m.user_id));
      return ms.map((m) => ({ ...m, role: m.role as Role, profile: ps?.find((p) => p.id === m.user_id) }));
    },
  });

  const invites = useQuery({
    queryKey: ["invitations", org!.id],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("org_id", org!.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const link = (token: string) => `${window.location.origin}/davet/${token}`;

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error("Geçerli bir e-posta girin");
    setInviting(true);
    const { data, error } = await supabase
      .from("invitations")
      .insert({ org_id: org!.id, email: email.trim().toLowerCase(), role, invited_by: user!.id })
      .select()
      .single();
    setInviting(false);
    if (error) return toast.error(errorMessage(error));
    setEmail("");
    qc.invalidateQueries({ queryKey: ["invitations"] });
    await navigator.clipboard?.writeText(link(data.token)).catch(() => {});
    toast.success("Davet oluşturuldu", { description: "Davet bağlantısı panoya kopyalandı. Kişiye iletin." });
  };

  const changeRole = async (userId: string, r: Role) => {
    const { error } = await supabase.from("memberships").update({ role: r }).eq("org_id", org!.id).eq("user_id", userId);
    if (error) return toast.error(errorMessage(error));
    qc.invalidateQueries({ queryKey: ["members"] });
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Bu kullanıcının firmaya erişimi kaldırılsın mı?")) return;
    const { error } = await supabase.from("memberships").delete().eq("org_id", org!.id).eq("user_id", userId);
    if (error) return toast.error(errorMessage(error));
    qc.invalidateQueries({ queryKey: ["members"] });
  };

  const removeInvite = async (id: string) => {
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) return toast.error(errorMessage(error));
    qc.invalidateQueries({ queryKey: ["invitations"] });
  };

  const assignable: Role[] = myRole === "owner" ? ["owner", "admin", "staff", "accountant"] : ["admin", "staff", "accountant"];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader icon={<Users />} title="Kullanıcılar" />
        {members.isPending ? (
          <Skeleton className="m-5 h-16" />
        ) : (
          <ul className="divide-y divide-border">
            {members.data?.map((m) => {
              const self = m.user_id === user?.id;
              const editable = isAdmin && !self && m.role !== "owner";
              return (
                <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {m.profile?.full_name || m.profile?.email || "Kullanıcı"} {self && <span className="text-muted">(siz)</span>}
                    </div>
                    <div className="truncate text-xs text-muted">{m.profile?.email}</div>
                  </div>
                  {editable ? (
                    <NativeSelect value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value as Role)} className="h-9 w-36">
                      {assignable.filter((r) => r !== "owner").map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Badge tone={m.role === "owner" ? "primary" : "neutral"}>{ROLE_LABELS[m.role]}</Badge>
                  )}
                  {editable && (
                    <Button size="icon-sm" variant="ghost" onClick={() => removeMember(m.user_id)} aria-label="Kullanıcıyı kaldır">
                      <Trash2 />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader icon={<UserPlus />} title="Kullanıcı Davet Et" />
          <form onSubmit={invite} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_180px_auto] sm:px-5">
            <Input type="email" placeholder="ornek@firma.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <NativeSelect value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {assignable.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" loading={inviting}>
              <Mail /> Davet oluştur
            </Button>
            <p className="text-xs text-muted sm:col-span-3">
              {ROLE_LABELS[role]}: {ROLE_HELP[role]}. Davet edilen kişi bu e-posta ile kayıt olup adresini doğruladığında firmaya otomatik
              eklenir; ya da davet bağlantısını açabilir.
            </p>
          </form>
          {!!invites.data?.length && (
            <ul className="divide-y divide-border border-t border-border">
              {invites.data.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.email}</div>
                    <div className="text-xs text-muted">
                      {ROLE_LABELS[i.role as Role]} · son geçerlilik {formatDate(i.expires_at)}
                    </div>
                  </div>
                  <Badge tone="warning">Bekliyor</Badge>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Bağlantıyı kopyala"
                    onClick={() => navigator.clipboard.writeText(link(i.token)).then(() => toast.success("Bağlantı kopyalandı"))}
                  >
                    <Copy />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Daveti sil" onClick={() => removeInvite(i.id)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
