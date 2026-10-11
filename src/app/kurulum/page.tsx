"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/auth-provider";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { BrandMark } from "@/components/layout/brand";
import { FullScreenLoader } from "@/components/layout/app-shell";

const schema = z.object({
  name: z.string().trim().min(2, "Firma adını girin"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/, "2-6 harf/rakam (örn. REN)")
    .or(z.literal("")),
  legal_name: z.string().trim().optional(),
  tax_number: z.string().trim().regex(/^(\d{10}|\d{11})?$/, "VKN 10, TCKN 11 haneli olmalı").optional(),
  tax_office: z.string().trim().optional(),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

function SetupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, loading, signOut } = useAuth();
  const { memberships, loading: orgLoading, refresh, switchOrg } = useOrg();
  const addingNew = params.get("yeni") === "1";

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "" },
  });

  React.useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/giris");
    else if (!orgLoading && memberships.length > 0 && !addingNew) router.replace("/panel");
  }, [loading, session, orgLoading, memberships.length, addingNew, router]);

  const onSubmit = form.handleSubmit(async (v) => {
    const { data, error } = await supabase.rpc("create_organization", {
      p_name: v.name,
      p_code: v.code || undefined,
      p_details: {
        legal_name: v.legal_name || v.name,
        tax_number: v.tax_number,
        tax_office: v.tax_office,
        city: v.city,
        district: v.district,
        address: v.address,
      },
    });
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    switchOrg(data);
    await refresh();
    toast.success("Firma oluşturuldu");
    router.replace("/panel");
  });

  if (loading || !session || (orgLoading && !addingNew)) return <FullScreenLoader />;

  const err = form.formState.errors;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark size={48} />
          <div>
            <h1 className="text-xl font-bold">{addingNew ? "Yeni firma ekle" : "Firmanızı oluşturun"}</h1>
            <p className="text-sm text-muted">Bu bilgiler fatura ve tekliflerde kullanılır; sonradan değiştirebilirsiniz.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 sm:p-6" noValidate>
          <Field label="Firma adı *" htmlFor="name" error={err.name?.message} className="sm:col-span-2">
            <Input id="name" placeholder="Ren Endüstriyel" {...form.register("name")} />
          </Field>
          <Field label="Kısa kod" htmlFor="code" error={err.code?.message} hint="Fatura numarası öneki (REN2026000001)">
            <Input id="code" placeholder="REN" maxLength={6} className="uppercase" {...form.register("code")} />
          </Field>
          <Field label="Ticari unvan" htmlFor="legal_name">
            <Input id="legal_name" {...form.register("legal_name")} />
          </Field>
          <Field label="VKN / TCKN" htmlFor="tax_number" error={err.tax_number?.message}>
            <Input id="tax_number" inputMode="numeric" maxLength={11} {...form.register("tax_number")} />
          </Field>
          <Field label="Vergi dairesi" htmlFor="tax_office">
            <Input id="tax_office" {...form.register("tax_office")} />
          </Field>
          <Field label="İl" htmlFor="city">
            <Input id="city" {...form.register("city")} />
          </Field>
          <Field label="İlçe" htmlFor="district">
            <Input id="district" {...form.register("district")} />
          </Field>
          <Field label="Adres" htmlFor="address" className="sm:col-span-2">
            <Input id="address" {...form.register("address")} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-between">
            {addingNew ? (
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Vazgeç
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={async () => { await signOut(); router.replace("/giris"); }}>
                <LogOut /> Çıkış
              </Button>
            )}
            <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
              Firmayı oluştur
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <React.Suspense fallback={<FullScreenLoader />}>
      <SetupForm />
    </React.Suspense>
  );
}
