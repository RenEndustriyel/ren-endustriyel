"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { AuthCard } from "../auth-card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalı");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(errorMessage(error));
    else {
      toast.success("Şifreniz güncellendi");
      router.replace("/panel");
    }
  };

  return (
    <AuthCard title="Yeni şifre belirleyin">
      {!authLoading && !session ? (
        <p className="text-sm text-muted">Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden şifre sıfırlama isteyin.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Yeni şifre" htmlFor="password">
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" loading={loading}>
            Şifreyi kaydet
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
