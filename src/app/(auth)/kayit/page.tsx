"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { AuthCard } from "../auth-card";

const schema = z
  .object({
    full_name: z.string().trim().min(2, "Adınızı girin"),
    email: z.string().trim().email("Geçerli bir e-posta girin"),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
    password2: z.string(),
  })
  .refine((v) => v.password === v.password2, { path: ["password2"], message: "Şifreler eşleşmiyor" });

export default function SignUpPage() {
  const router = useRouter();
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "", password2: "" },
  });

  const onSubmit = form.handleSubmit(async (v) => {
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { data: { full_name: v.full_name }, emailRedirectTo: `${window.location.origin}/panel` },
    });
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    if (data.session) router.replace("/panel");
    else setSentTo(v.email);
  });

  if (sentTo) {
    return (
      <AuthCard title="E-postanızı doğrulayın">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="rounded-full bg-success-soft p-3 text-success">
            <MailCheck className="size-7" />
          </div>
          <p className="text-sm">
            <b>{sentTo}</b> adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsiniz.
          </p>
          <Link href="/giris" className="text-sm font-medium text-primary hover:underline">
            Giriş sayfasına dön
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Kayıt ol"
      subtitle="Birkaç saniyede hesabınızı oluşturun."
      footer={
        <>
          Zaten hesabınız var mı?{" "}
          <Link href="/giris" className="font-medium text-primary hover:underline">
            Giriş yapın
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Ad Soyad" htmlFor="full_name" error={form.formState.errors.full_name?.message}>
          <Input id="full_name" autoComplete="name" {...form.register("full_name")} />
        </Field>
        <Field label="E-posta" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </Field>
        <Field label="Şifre" htmlFor="password" error={form.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <Field label="Şifre (tekrar)" htmlFor="password2" error={form.formState.errors.password2?.message}>
          <Input id="password2" type="password" autoComplete="new-password" {...form.register("password2")} />
        </Field>
        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          Hesap oluştur
        </Button>
      </form>
    </AuthCard>
  );
}
