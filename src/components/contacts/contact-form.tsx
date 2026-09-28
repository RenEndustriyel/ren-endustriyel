"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { usePriceLists, useSave, type Row } from "@/lib/data";
import { CURRENCIES } from "@/lib/doc-types";
import { useConfirm } from "@/components/ui/confirm";

export type ContactKind = "customer" | "supplier" | "both";
type Contact = Row<"contacts">;

type Values = {
  kind: ContactKind;
  entity_type: "company" | "person";
  name: string;
  code: string;
  tax_number: string;
  tax_office: string;
  contact_person: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  district: string;
  city: string;
  iban: string;
  payment_term_days: string;
  price_list_id: string;
  currency: string;
  notes: string;
  tags: string;
  opening_amount: number;
  opening_side: "debit" | "credit";
  opening_balance_date: string;
};

export function ContactForm({
  contact,
  defaultKind = "customer",
  defaultName,
  onSaved,
  onCancel,
}: {
  contact?: Contact | null;
  defaultKind?: ContactKind;
  defaultName?: string;
  onSaved: (c: Contact) => void;
  onCancel?: () => void;
}) {
  const confirm = useConfirm();
  const { save, isPending } = useSave("contacts");
  const priceLists = usePriceLists();
  const form = useForm<Values>({
    defaultValues: {
      kind: (contact?.kind as ContactKind) ?? defaultKind,
      entity_type: (contact?.entity_type as "company" | "person") ?? "company",
      name: contact?.name ?? defaultName ?? "",
      code: contact?.code ?? "",
      tax_number: contact?.tax_number ?? "",
      tax_office: contact?.tax_office ?? "",
      contact_person: contact?.contact_person ?? "",
      phone: contact?.phone ?? "",
      mobile: contact?.mobile ?? "",
      email: contact?.email ?? "",
      address: contact?.address ?? "",
      district: contact?.district ?? "",
      city: contact?.city ?? "",
      iban: contact?.iban ?? "",
      payment_term_days: contact?.payment_term_days?.toString() ?? "",
      price_list_id: contact?.price_list_id ?? "",
      currency: contact?.currency ?? "TRY",
      notes: contact?.notes ?? "",
      tags: (contact?.tags ?? []).join(", "),
      opening_amount: Math.abs(Number(contact?.opening_balance ?? 0)),
      opening_side: Number(contact?.opening_balance ?? 0) < 0 ? "credit" : "debit",
      opening_balance_date: contact?.opening_balance_date ?? "",
    },
  });
  const err = form.formState.errors;

  const submit = form.handleSubmit(async (v) => {
    const tax = v.tax_number.replace(/\s/g, "");
    if (tax && !/^\d{10,11}$/.test(tax)) {
      form.setError("tax_number", { message: "VKN 10, TCKN 11 haneli olmalı" });
      return;
    }

    if (contact) {
      const ok = await confirm({
        title: "Cari kart güncellensin mi?",
        description: "Cari kartındaki değişiklikler kaydedilecek. Onaylıyor musunuz?",
        confirmText: "Evet, Güncelle",
      });
      if (!ok) return;
    }
    const row = {
      ...(contact ? { id: contact.id } : {}),
      kind: v.kind,
      entity_type: v.entity_type,
      name: v.name.trim(),
      code: v.code.trim() || null,
      tax_number: tax || null,
      tax_office: v.tax_office.trim() || null,
      contact_person: v.contact_person.trim() || null,
      phone: v.phone.trim() || null,
      mobile: v.mobile.trim() || null,
      email: v.email.trim() || null,
      address: v.address.trim() || null,
      district: v.district.trim() || null,
      city: v.city.trim() || null,
      iban: v.iban.replace(/\s/g, "").toUpperCase() || null,
      payment_term_days: v.payment_term_days ? Number(v.payment_term_days) : null,
      price_list_id: v.price_list_id || null,
      currency: v.currency,
      notes: v.notes.trim() || null,
      tags: v.tags.split(",").map((t) => t.trim()).filter(Boolean),
      opening_balance: v.opening_side === "credit" ? -v.opening_amount : v.opening_amount,
      opening_balance_date: v.opening_amount ? v.opening_balance_date || null : null,
    };
    const res = await save<Contact>(row, contact ? "Cari güncellendi" : "Cari oluşturuldu");
    onSaved(res.data as Contact);
  });

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Controller
        control={form.control}
        name="kind"
        render={({ field }) => (
          <div className="sm:col-span-2">
            <Segmented
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "customer", label: "Müşteri" },
                { value: "supplier", label: "Tedarikçi" },
                { value: "both", label: "Her ikisi" },
              ]}
            />
          </div>
        )}
      />
      <Field label="Tür" htmlFor="entity_type">
        <NativeSelect id="entity_type" {...form.register("entity_type")}>
          <option value="company">Tüzel kişi (firma)</option>
          <option value="person">Gerçek kişi (şahıs)</option>
        </NativeSelect>
      </Field>
      <Field label="Cari kodu" htmlFor="code" hint="İsteğe bağlı">
        <Input id="code" {...form.register("code")} />
      </Field>
      <Field label="Unvan / Ad Soyad *" htmlFor="name" error={err.name?.message} className="sm:col-span-2">
        <Input id="name" autoFocus {...form.register("name", { required: "Unvan gerekli" })} />
      </Field>
      <Field label="VKN / TCKN" htmlFor="tax_number" error={err.tax_number?.message}>
        <Input id="tax_number" inputMode="numeric" maxLength={11} {...form.register("tax_number")} />
      </Field>
      <Field label="Vergi dairesi" htmlFor="tax_office">
        <Input id="tax_office" {...form.register("tax_office")} />
      </Field>
      <Field label="Yetkili kişi" htmlFor="contact_person">
        <Input id="contact_person" {...form.register("contact_person")} />
      </Field>
      <Field label="E-posta" htmlFor="email">
        <Input id="email" type="email" {...form.register("email")} />
      </Field>
      <Field label="Telefon" htmlFor="phone">
        <Input id="phone" type="tel" {...form.register("phone")} />
      </Field>
      <Field label="Cep telefonu" htmlFor="mobile" hint="WhatsApp paylaşımı için">
        <Input id="mobile" type="tel" {...form.register("mobile")} />
      </Field>
      <Field label="Adres" htmlFor="address" className="sm:col-span-2">
        <Input id="address" {...form.register("address")} />
      </Field>
      <Field label="İlçe" htmlFor="district">
        <Input id="district" {...form.register("district")} />
      </Field>
      <Field label="İl" htmlFor="city">
        <Input id="city" {...form.register("city")} />
      </Field>
      <Field label="IBAN" htmlFor="iban">
        <Input id="iban" {...form.register("iban")} />
      </Field>
      <Field label="Vade (gün)" htmlFor="payment_term_days" hint="Faturada otomatik vade">
        <Input id="payment_term_days" type="number" min={0} {...form.register("payment_term_days")} />
      </Field>
      <Field label="Fiyat listesi" htmlFor="price_list_id">
        <NativeSelect id="price_list_id" {...form.register("price_list_id")}>
          <option value="">Varsayılan satış fiyatı</option>
          {priceLists.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Para birimi" htmlFor="currency">
        <NativeSelect id="currency" {...form.register("currency")}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Etiketler" htmlFor="tags" hint="Virgülle ayırın" className="sm:col-span-2">
        <Input id="tags" {...form.register("tags")} />
      </Field>

      <div className="rounded-xl border border-border bg-surface-2 p-3 sm:col-span-2">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Açılış bakiyesi</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Controller
            control={form.control}
            name="opening_amount"
            render={({ field }) => <NumberInput value={field.value} onChange={field.onChange} suffix="₺" />}
          />
          <NativeSelect {...form.register("opening_side")}>
            <option value="debit">Cari bize borçlu</option>
            <option value="credit">Biz cariye borçluyuz</option>
          </NativeSelect>
          <Input type="date" {...form.register("opening_balance_date")} />
        </div>
      </div>

      <Field label="Notlar" htmlFor="notes" className="sm:col-span-2">
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </Field>

      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
        <Button type="submit" loading={isPending}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
