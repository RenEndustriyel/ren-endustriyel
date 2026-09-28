"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { AuthCard } from "../auth-card";

const schema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, loading } = useAuth();
  const next = params.get("next") || "/panel";
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  React.useEffect(() => {
    if (!loading && session) router.replace(next);
  }, [loading, session, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    router.replace(next);
  });

  return (
    <AuthCard
      title="Giriş yap"
      subtitle="Hesabınıza giriş yaparak devam edin."
      footer={
        <>
          Hesabınız yok mu?{" "}
          <Link href="/kayit" className="font-medium text-primary hover:underline">
            Kayıt olun
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="E-posta" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </Field>
        <Field label="Şifre" htmlFor="password" error={form.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        <div className="-mt-1 text-right">
          <Link href="/sifremi-unuttum" className="text-xs font-medium text-muted hover:text-primary">
            Şifremi unuttum
          </Link>
        </div>
        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          Giriş yap
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  );
}
