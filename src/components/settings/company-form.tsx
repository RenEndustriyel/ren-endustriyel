"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useOrg, type Organization } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

type FormValues = Pick<
  Organization,
  "name" | "legal_name" | "code" | "tax_number" | "tax_office" | "address" | "district" | "city" | "phone" | "email" | "website" | "iban"
> & { default_vat_rate: string };

export function useLogoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["logo-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("files").createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function CompanyForm() {
  const { org, isAdmin, refresh } = useOrg();
  const qc = useQueryClient();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const logo = useLogoUrl(org?.logo_path);

  const form = useForm<FormValues>({
    values: {
      name: org?.name ?? "",
      legal_name: org?.legal_name ?? "",
      code: org?.code ?? "",
      tax_number: org?.tax_number ?? "",
      tax_office: org?.tax_office ?? "",
      address: org?.address ?? "",
      district: org?.district ?? "",
      city: org?.city ?? "",
      phone: org?.phone ?? "",
      email: org?.email ?? "",
      website: org?.website ?? "",
      iban: org?.iban ?? "",
      default_vat_rate: String(org?.default_vat_rate ?? 20),
    },
  });

  if (!org) return null;

  const onSubmit = form.handleSubmit(async (v) => {
    const code = (v.code ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}$/.test(code)) {
      form.setError("code", { message: "2-6 harf/rakam" });
      return;
    }
    const { error } = await supabase
      .from("organizations")
      .update({
        ...v,
        code,
        name: v.name.trim(),
        default_vat_rate: Number(v.default_vat_rate),
      })
      .eq("id", org.id);
    if (error) return toast.error(errorMessage(error));
    await refresh();
    toast.success("Firma bilgileri kaydedildi");
  });

  const uploadLogo = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo en fazla 2 MB olabilir");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${org.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("files").upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      setUploading(false);
      return toast.error(errorMessage(error));
    }
    const old = org.logo_path;
    const { error: e2 } = await supabase.from("organizations").update({ logo_path: path }).eq("id", org.id);
    if (!e2 && old) await supabase.storage.from("files").remove([old]);
    setUploading(false);
    if (e2) return toast.error(errorMessage(e2));
    await refresh();
    qc.invalidateQueries({ queryKey: ["logo-url"] });
    toast.success("Logo güncellendi");
  };

  const removeLogo = async () => {
    if (!org.logo_path) return;
    await supabase.storage.from("files").remove([org.logo_path]);
    await supabase.from("organizations").update({ logo_path: null }).eq("id", org.id);
    await refresh();
  };

  const reg = (name: keyof FormValues) => ({ id: name, disabled: !isAdmin, ...form.register(name) });

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Logo" />
        <CardBody className="flex flex-col items-center gap-3">
          <div className="flex size-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-2">
            {logo.data ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.data} alt="Firma logosu" className="size-full object-contain p-2" />
            ) : (
              <ImagePlus className="size-8 text-muted" />
            )}
          </div>
          <p className="text-center text-xs text-muted">Fatura, teklif ve irsaliye PDF&apos;lerinde kullanılır. PNG/JPG, en fazla 2 MB.</p>
          {isAdmin && (
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
              <Button size="sm" variant="outline" loading={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus /> Yükle
              </Button>
              {org.logo_path && (
                <Button size="sm" variant="ghost" onClick={removeLogo} aria-label="Logoyu kaldır">
                  <Trash2 />
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Firma Bilgileri" />
        <CardBody>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Firma adı" htmlFor="name">
              <Input {...reg("name")} />
            </Field>
            <Field label="Ticari unvan" htmlFor="legal_name">
              <Input {...reg("legal_name")} />
            </Field>
            <Field label="VKN / TCKN" htmlFor="tax_number">
              <Input inputMode="numeric" maxLength={11} {...reg("tax_number")} />
            </Field>
            <Field label="Vergi dairesi" htmlFor="tax_office">
              <Input {...reg("tax_office")} />
            </Field>
            <Field label="Adres" htmlFor="address" className="sm:col-span-2">
              <Input {...reg("address")} />
            </Field>
            <Field label="İlçe" htmlFor="district">
              <Input {...reg("district")} />
            </Field>
            <Field label="İl" htmlFor="city">
              <Input {...reg("city")} />
            </Field>
            <Field label="Telefon" htmlFor="phone">
              <Input type="tel" {...reg("phone")} />
            </Field>
            <Field label="E-posta" htmlFor="email">
              <Input type="email" {...reg("email")} />
            </Field>
            <Field label="Web sitesi" htmlFor="website">
              <Input {...reg("website")} />
            </Field>
            <Field label="IBAN" htmlFor="iban" hint="İsteğe bağlı; faturada gösterilir">
              <Input {...reg("iban")} />
            </Field>
            <Field label="Kısa kod" htmlFor="code" error={form.formState.errors.code?.message} hint="Satış faturası numara öneki">
              <Input maxLength={6} className="uppercase" {...reg("code")} />
            </Field>
            <Field label="Varsayılan KDV" htmlFor="default_vat_rate">
              <NativeSelect {...reg("default_vat_rate")}>
                {[0, 1, 10, 20].map((r) => (
                  <option key={r} value={r}>
                    %{r}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {isAdmin && (
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" loading={form.formState.isSubmitting}>
                  Kaydet
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
