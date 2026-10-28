"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound, Lock, Mail, RotateCcw, Trash2, UserPlus, Users } from "lucide-react";
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
import { useContacts } from "@/lib/data";

const ROLE_HELP: Record<Role, string> = {
  owner: "Tüm yetkiler",
  admin: "Tüm yetkiler (sahiplik hariç)",
  staff: "Kayıt girer; kasa bakiyeleri, raporlar ve ayarlar kapalı",
  accountant: "Salt okunur; raporları görür ve dışa aktarır",
  b2b: "B2B Müşteri / Bayi; sadece ürünleri ve fiyatları görebilir, diğer menüler kapalıdır",
};

export function UsersSettings() {
  const { org, isAdmin, role: myRole } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("b2b");
  const [inviting, setInviting] = React.useState(false);

  // Kendi şifresini değiştirme / sıfırlama state'leri
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [updatingPassword, setUpdatingPassword] = React.useState(false);
  const [sendingSelfReset, setSendingSelfReset] = React.useState(false);

  // Yöneticinin doğrudan yeni kullanıcı (B2B/Personel) oluşturma state'leri
  const [createEmail, setCreateEmail] = React.useState("");
  const [createFullName, setCreateFullName] = React.useState("");
  const [createPassword, setCreatePassword] = React.useState("");
  const [createRole, setCreateRole] = React.useState<Role>("b2b");
  const [createContactId, setCreateContactId] = React.useState("");
  const [showCreatePassword, setShowCreatePassword] = React.useState(false);
  const [creatingUser, setCreatingUser] = React.useState(false);

  const contactsQuery = useContacts();
  const customerContacts = React.useMemo(
    () => (contactsQuery.data ?? []).filter((c) => c.kind === "customer"),
    [contactsQuery.data]
  );

  // Yöneticinin diğer üyelere sıfırlama linki gönderme state'i
  const [resettingUserId, setResettingUserId] = React.useState<string | null>(null);

  const members = useQuery({
    queryKey: ["members", org!.id],
    queryFn: async () => {
      const { data: ms, error } = await supabase.from("memberships").select("user_id, role, created_at").eq("org_id", org!.id);
      if (error) throw error;
      const { data: ps } = await supabase.from("profiles").select("id, email, full_name").in("id", ms.map((m) => m.user_id));
      const b2bEmails: string[] = Array.isArray((org?.settings as any)?.b2b_emails)
        ? (org?.settings as any).b2b_emails.map((e: string) => e.toLowerCase())
        : [];
      return ms.map((m) => {
        const prof = ps?.find((p) => p.id === m.user_id);
        const isMemberB2B = prof?.email && b2bEmails.includes(prof.email.toLowerCase());
        return {
          ...m,
          role: (isMemberB2B ? "b2b" : (m.role as Role)) as Role,
          profile: prof,
        };
      });
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
    const targetEmail = email.trim().toLowerCase();
    const isTargetB2B = role === "b2b";
    const dbRole = isTargetB2B ? "accountant" : role;

    const { data, error } = await supabase
      .from("invitations")
      .insert({ org_id: org!.id, email: targetEmail, role: dbRole as any, invited_by: user!.id })
      .select()
      .single();
    setInviting(false);
    if (error) return toast.error(errorMessage(error));

    if (isTargetB2B) {
      try {
        const { data: orgData } = await supabase.from("organizations").select("settings").eq("id", org!.id).single();
        const existingSettings = (orgData?.settings && typeof orgData.settings === "object" ? orgData.settings : {}) as Record<string, any>;
        const currentB2BEmails: string[] = Array.isArray(existingSettings.b2b_emails) ? existingSettings.b2b_emails : [];
        if (!currentB2BEmails.includes(targetEmail)) {
          await supabase
            .from("organizations")
            .update({
              settings: {
                ...existingSettings,
                b2b_emails: [...currentB2BEmails, targetEmail],
              },
            })
            .eq("id", org!.id);
        }
      } catch {
        // ignore
      }
    }

    setEmail("");
    qc.invalidateQueries({ queryKey: ["invitations"] });
    await navigator.clipboard?.writeText(link(data.token)).catch(() => {});
    toast.success("Davet oluşturuldu", { description: "Davet bağlantısı panoya kopyalandı. Kişiye iletin." });
  };

  const changeRole = async (userId: string, r: Role) => {
    const isTargetB2B = r === "b2b";
    const dbRole = isTargetB2B ? "accountant" : r;
    const { error } = await supabase.from("memberships").update({ role: dbRole }).eq("org_id", org!.id).eq("user_id", userId);
    if (error) return toast.error(errorMessage(error));

    // B2B e-postalarını org.settings içinde senkronize et
    try {
      const targetMember = members.data?.find((m) => m.user_id === userId);
      const targetEmail = targetMember?.profile?.email?.toLowerCase();
      if (targetEmail) {
        const { data: orgData } = await supabase.from("organizations").select("settings").eq("id", org!.id).single();
        const existingSettings = (orgData?.settings && typeof orgData.settings === "object" ? orgData.settings : {}) as Record<string, any>;
        const currentB2BEmails: string[] = Array.isArray(existingSettings.b2b_emails) ? existingSettings.b2b_emails : [];
        let updatedB2BEmails = [...currentB2BEmails];
        if (isTargetB2B && !updatedB2BEmails.includes(targetEmail)) {
          updatedB2BEmails.push(targetEmail);
        } else if (!isTargetB2B && updatedB2BEmails.includes(targetEmail)) {
          updatedB2BEmails = updatedB2BEmails.filter((e) => e !== targetEmail);
        }
        await supabase
          .from("organizations")
          .update({
            settings: { ...existingSettings, b2b_emails: updatedB2BEmails },
          })
          .eq("id", org!.id);
      }
    } catch {
      // ignore
    }

    qc.invalidateQueries({ queryKey: ["members"] });
    toast.success("Kullanıcı rolü güncellendi");
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

  // Kendi şifresini doğrudan güncelleme
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Lütfen yeni şifrenizi girin");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Şifre en az 8 karakter olmalıdır");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Girdiğiniz yeni şifreler birbiriyle eşleşmiyor");
      return;
    }

    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);

    if (error) {
      toast.error(errorMessage(error));
    } else {
      toast.success("Şifreniz başarıyla güncellendi");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Kendi e-postasına sıfırlama bağlantısı gönderme
  const handleSendSelfReset = async () => {
    if (!user?.email) return toast.error("Kullanıcı e-posta adresi bulunamadı");
    setSendingSelfReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/sifre-yenile`,
    });
    setSendingSelfReset(false);
    if (error) {
      toast.error(errorMessage(error));
    } else {
      toast.success("Şifre sıfırlama bağlantısı gönderildi", {
        description: `${user.email} adresinize sıfırlama bağlantısı iletildi. Gelen kutunuzu kontrol edin.`,
      });
    }
  };

  // Yöneticinin başka bir üyeye sıfırlama e-postası göndermesi
  const handleSendMemberReset = async (targetUser: { id: string; email?: string | null; name?: string | null }) => {
    if (!targetUser.email) return toast.error("Kullanıcının e-posta adresi bulunamadı");
    const label = targetUser.name ? `${targetUser.name} (${targetUser.email})` : targetUser.email;
    if (!confirm(`${label} kullanıcısına şifre sıfırlama bağlantısı içeren bir e-posta gönderilsin mi?`)) return;

    setResettingUserId(targetUser.id);
    const { error } = await supabase.auth.resetPasswordForEmail(targetUser.email, {
      redirectTo: `${window.location.origin}/sifre-yenile`,
    });
    setResettingUserId(null);

    if (error) {
      toast.error(errorMessage(error));
    } else {
      toast.success(`${targetUser.email} adresine şifre sıfırlama bağlantısı gönderildi.`);
    }
  };

  // Yöneticinin doğrudan yeni kullanıcı (B2B veya Personel) oluşturması
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim()) return toast.error("Lütfen e-posta adresi girin");
    if (!/^\S+@\S+\.\S+$/.test(createEmail.trim())) return toast.error("Geçerli bir e-posta girin");
    if (createPassword.length < 8) return toast.error("Şifre en az 8 karakter olmalıdır");

    setCreatingUser(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Oturum süresi dolmuş, lütfen sayfayı yenileyip tekrar giriş yapın");

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orgId: org!.id,
          email: createEmail.trim(),
          password: createPassword,
          fullName: createFullName.trim() || undefined,
          role: createRole,
          contactId: createRole === "b2b" ? createContactId || undefined : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Kullanıcı oluşturulurken bir hata oluştu");
      }

      if (json.needsEmailConfirmation) {
        toast.info("Kullanıcı oluşturuldu!", {
          description: `${createEmail.trim()} adresine onay bağlantısı iletildi. Supabase ayarlarınızda 'E-posta Onayı' açık olduğundan, linke tıklandıktan sonra giriş yapılabilir. (Veya Supabase panelinden Confirm email kapatılabilir).`,
        });
      } else {
        toast.success("Kullanıcı başarıyla oluşturuldu!", {
          description: `${createEmail.trim()} bu şifre ile hemen sisteme giriş yapabilir.`,
        });
      }
      setCreateEmail("");
      setCreateFullName("");
      setCreatePassword("");
      setCreateRole("b2b");
      setCreateContactId("");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["invitations"] });
    } catch (err: any) {
      toast.error(err?.message || "Kullanıcı oluşturulamadı");
    } finally {
      setCreatingUser(false);
    }
  };

  const assignable: Role[] =
    myRole === "owner" ? ["owner", "admin", "staff", "accountant", "b2b"] : ["admin", "staff", "accountant", "b2b"];

  return (
    <div className="grid gap-4">
      {/* 1. Şifre Değiştirme ve Güvenlik Kartı */}
      <Card>
        <CardHeader icon={<KeyRound />} title="Şifre Değiştirme ve Güvenlik" />
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <div className="text-sm font-medium text-text">
                Hesap: <span className="font-semibold text-primary">{user?.email}</span>
              </div>
              <p className="text-xs text-muted">
                Mevcut oturum açtığınız hesabınızın şifresini doğrudan buradan yenileyebilir veya e-postanıza bağlantı isteyebilirsiniz.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={sendingSelfReset}
              onClick={handleSendSelfReset}
              title="Kayıtlı e-postanıza şifre sıfırlama bağlantısı gönderir"
            >
              <RotateCcw className="size-3.5" /> E-postama Sıfırlama Bağlantısı Gönder
            </Button>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="new-password">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="En az 8 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                    title={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="confirm-password">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Şifreyi tekrar yazın"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                    title={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs text-muted">Şifreniz güvenliğiniz için en az 8 karakter uzunluğunda olmalıdır.</span>
              <Button type="submit" loading={updatingPassword} disabled={!newPassword || !confirmPassword}>
                <Lock className="size-4" /> Şifreyi Güncelle
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* 2. Kullanıcılar Kartı */}
      <Card>
        <CardHeader icon={<Users />} title="Kullanıcılar" />
        {members.isPending ? (
          <Skeleton className="m-5 h-16" />
        ) : (
          <ul className="divide-y divide-border">
            {members.data?.map((m) => {
              const self = m.user_id === user?.id;
              const editable = isAdmin && !self && m.role !== "owner";
              const canSendReset = isAdmin && !self && !!m.profile?.email;
              const isResetting = resettingUserId === m.user_id;

              return (
                <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {m.profile?.full_name || m.profile?.email || "Kullanıcı"} {self && <span className="text-muted">(siz)</span>}
                    </div>
                    <div className="truncate text-xs text-muted">{m.profile?.email}</div>
                  </div>

                  {canSendReset && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      loading={isResetting}
                      onClick={() =>
                        handleSendMemberReset({
                          id: m.user_id,
                          email: m.profile?.email,
                          name: m.profile?.full_name,
                        })
                      }
                      title="Kullanıcının e-postasına şifre sıfırlama bağlantısı gönderir"
                    >
                      <RotateCcw className="size-3.5" />
                      <span className="hidden md:inline">Şifre Sıfırla</span>
                    </Button>
                  )}

                  {editable ? (
                    <NativeSelect value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value as Role)} className="h-9 w-36">
                      {assignable.filter((r) => r !== "owner").map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Badge tone={m.role === "owner" ? "primary" : m.role === "b2b" ? "warning" : "neutral"}>
                      {ROLE_LABELS[m.role]}
                    </Badge>
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

      {/* 3. Yeni Kullanıcı ve B2B Bayi Oluştur (Doğrudan Şifre Belirleyerek) */}
      {isAdmin && (
        <Card>
          <CardHeader icon={<UserPlus />} title="Yeni Kullanıcı ve B2B Bayi Oluştur" />
          <div className="p-4 sm:p-5">
            <p className="mb-4 text-xs text-muted">
              Kullanıcı veya bayiniz için e-posta, ad soyad ve ilk giriş şifresini belirleyin. Kullanıcı bu bilgilerle hemen sisteme giriş
              yapabilir.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="create-name">
                    Ad Soyad / Bayi Unvanı
                  </label>
                  <Input
                    id="create-name"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="create-email">
                    E-posta Adresi *
                  </label>
                  <Input
                    id="create-email"
                    type="email"
                    required
                    placeholder="bayi@firma.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="create-role">
                    Kullanıcı Rolü *
                  </label>
                  <NativeSelect
                    id="create-role"
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as Role)}
                  >
                    {assignable.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="create-password">
                    Giriş Şifresi *
                  </label>
                  <div className="relative">
                    <Input
                      id="create-password"
                      type={showCreatePassword ? "text" : "password"}
                      required
                      placeholder="En az 8 karakter"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                      title={showCreatePassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showCreatePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {createRole === "b2b" && (
                  <div className="sm:col-span-2 lg:col-span-4 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 p-3 border border-brand-200/60 dark:border-brand-900/60">
                    <label className="mb-1 block text-xs font-semibold text-brand-900 dark:text-brand-200" htmlFor="create-contact">
                      Bağlı Cari Müşteri (Siparişlerin Düşeceği Cari Kartı)
                    </label>
                    <NativeSelect
                      id="create-contact"
                      value={createContactId}
                      onChange={(e) => setCreateContactId(e.target.value)}
                      className="bg-white dark:bg-slate-900"
                    >
                      <option value="">— Cari Müşteri Seçin (İsteğe bağlı) —</option>
                      {customerContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.city ? `(${c.city})` : ""}
                        </option>
                      ))}
                    </NativeSelect>
                    <p className="mt-1 text-[11px] text-brand-700 dark:text-brand-300">
                      Müşteri bu girişle sipariş verdiğinde, sipariş doğrudan burada seçtiğiniz cari adına oluşturulur ve geçmiş siparişlerini takip edebilir.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-muted">
                  <span className="font-semibold text-text">{ROLE_LABELS[createRole]}:</span> {ROLE_HELP[createRole]}
                </span>
                <Button type="submit" loading={creatingUser} disabled={!createEmail || !createPassword}>
                  <UserPlus className="size-4" /> Kullanıcıyı Hemen Oluştur
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* 4. Davet Bağlantısı ile Kullanıcı Çağır */}
      {isAdmin && (
        <Card>
          <CardHeader icon={<Mail />} title="Davet Bağlantısı ile Kullanıcı Çağır" />
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
              {ROLE_LABELS[role]}: {ROLE_HELP[role]}. Davet bağlantısını kopyalayıp ilgili kişiye gönderebilirsiniz.
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
