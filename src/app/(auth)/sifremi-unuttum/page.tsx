"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { AuthCard } from "../auth-card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/sifre-yenile`,
    });
    setLoading(false);
    if (error) toast.error(errorMessage(error));
    else setSent(true);
  };

  return (
    <AuthCard
      title="Şifremi unuttum"
      subtitle="E-posta adresinize şifre yenileme bağlantısı gönderelim."
      footer={
        <Link href="/giris" className="font-medium text-primary hover:underline">
          Giriş sayfasına dön
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm">Bağlantı gönderildi. Gelen kutunuzu (ve istenmeyen klasörünü) kontrol edin.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="E-posta" htmlFor="email">
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" loading={loading}>
            Bağlantı gönder
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
