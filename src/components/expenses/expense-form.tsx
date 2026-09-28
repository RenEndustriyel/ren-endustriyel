"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { onlineManager } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { newId, useAccounts, useCategories, useRpc, useSave, type Row } from "@/lib/data";
import { VAT_RATES } from "@/lib/doc-types";
import { calcDocument } from "@/lib/doc-calc";
import { formatMoney, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { useDocument } from "@/components/documents/document-editor";

/** Fotoğrafı küçültüp JPEG'e çevirir (yükleme boyutunu düşürür) */
async function compressImage(file: File, max = 1600): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.82));
}

export function ExpenseFormPage({ editId }: { editId?: string | null }) {
  const q = useDocument(editId);
  if (editId && q.isPending) return <Skeleton className="mx-auto h-96 max-w-2xl rounded-card" />;
  return <ExpenseForm key={editId ?? "new"} doc={q.data ?? null} />;
}

function ExpenseForm({ doc }: { doc: (Row<"documents"> & { lines: Row<"document_lines">[] }) | null }) {
  const router = useRouter();
  const { org } = useOrg();
  const cats = useCategories("expense");
  const accounts = useAccounts();
  const saveDoc = useRpc<Row<"documents">>("save_document");
  const saveCat = useSave("categories");
  const saveAtt = useSave("attachments");
  const line = doc?.lines?.[0];
  const [v, setV] = React.useState({
    issue_date: doc?.issue_date ?? isoDate(),
    category_id: doc?.category_id ?? null,
    description: doc?.description ?? "",
    contact_id: doc?.contact_id ?? null,
    number: doc?.number ?? "",
    amount: line ? Number(doc!.total) : 0,
    vat_rate: Number(line?.vat_rate ?? 20),
    paid: !doc,
    account_id: "",
    due_date: doc?.due_date ?? "",
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const active = (accounts.data ?? []).filter((a) => a.is_active);
  const accountId = v.account_id || active.find((a) => a.type === "cash")?.id || active[0]?.id || "";
  const calc = calcDocument({ prices_include_vat: true, discount_type: "rate", discount_value: 0, exchange_rate: 1 }, [{ quantity: 1, unit_price: v.amount, discount_rate: 0, vat_rate: v.vat_rate }]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!v.amount) return setErr("Tutar girin.");
    if (!v.category_id && !v.description.trim()) return setErr("Kategori veya açıklama girin.");
    setBusy(true);
    const id = doc?.id ?? newId();
    const catName = cats.data?.find((c) => c.id === v.category_id)?.name;
    await saveDoc.call({
      p_doc: {
        id,
        org_id: org!.id,
        doc_type: "expense",
        status: "approved",
        number: v.number.trim() || null,
        issue_date: v.issue_date,
        due_date: v.paid ? v.issue_date : v.due_date || null,
        contact_id: v.contact_id,
        category_id: v.category_id,
        currency: "TRY",
        exchange_rate: 1,
        prices_include_vat: true,
        description: v.description.trim() || catName || "Masraf",
      },
      p_lines: [{ description: v.description.trim() || catName || "Masraf", quantity: 1, unit_price: v.amount, vat_rate: v.vat_rate, discount_rate: 0 }],
      p_payment: v.paid && !doc && accountId ? { id: newId(), account_id: accountId, method: "cash" } : null,
    }, doc ? "Masraf güncellendi" : "Masraf kaydedildi");

    if (photo) {
      if (!onlineManager.isOnline()) {
        toast.warning("Fiş fotoğrafı çevrimdışıyken yüklenemedi; bağlantı gelince masrafı açıp tekrar ekleyin.");
      } else {
        const blob = await compressImage(photo);
        const path = `${org!.id}/receipts/${id}-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("files").upload(path, blob, { contentType: "image/jpeg" });
        if (error) toast.error("Fotoğraf yüklenemedi: " + error.message);
        else await saveAtt.save({ entity_type: "document", entity_id: id, storage_path: path, file_name: photo.name || "fis.jpg", mime_type: "image/jpeg", size_bytes: blob.size });
      }
    }
    setBusy(false);
    router.replace(`/giderler/masraflar/detay?id=${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back title={doc ? "Masrafı düzenle" : "Yeni masraf / fiş"} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Tutar (KDV dahil) *" className="sm:col-span-2">
              <NumberInput value={v.amount} onChange={(n) => set("amount", n)} className="h-12 text-lg font-semibold" autoFocus suffix="₺" />
            </Field>
            <Field label="Kategori">
              <Combobox
                value={v.category_id}
                onChange={(c) => set("category_id", c)}
                options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Kategori seçin"
                onCreate={async (name) => {
                  if (!name.trim()) return;
                  const r = await saveCat.save<{ id: string }>({ type: "expense", name: name.trim() });
                  set("category_id", r.data?.id ?? null);
                }}
                createLabel="Yeni kategori"
              />
            </Field>
            <Field label="KDV oranı">
              <NativeSelect value={String(v.vat_rate)} onChange={(e) => set("vat_rate", Number(e.target.value))}>
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>
                    %{r}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Açıklama" className="sm:col-span-2">
              <Input value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Örn. Ekim ayı elektrik faturası" />
            </Field>
            <Field label="Tarih">
              <Input type="date" value={v.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
            </Field>
            <Field label="Fiş / fatura no">
              <Input value={v.number} onChange={(e) => set("number", e.target.value)} />
            </Field>
            <Field label="Tedarikçi (isteğe bağlı)" className="sm:col-span-2">
              <ContactPicker value={v.contact_id} onChange={(id) => set("contact_id", id)} kind="supplier" clearable />
            </Field>
            <div className="flex justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm sm:col-span-2">
              <span className="text-muted">Matrah {formatMoney(calc.net_total)} + KDV {formatMoney(calc.vat_total)}</span>
              <span className="num font-semibold">{formatMoney(calc.total)}</span>
            </div>
          </CardBody>
        </Card>

        {!doc && (
          <Card>
            <CardBody className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <Switch checked={v.paid} onCheckedChange={(p) => set("paid", p)} />
                Ödendi
              </label>
              {v.paid ? (
                <Field label="Ödenen hesap" className="sm:col-span-2">
                  <NativeSelect value={accountId} onChange={(e) => set("account_id", e.target.value)}>
                    {active.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              ) : (
                <Field label="Son ödeme tarihi">
                  <Input type="date" value={v.due_date} onChange={(e) => set("due_date", e.target.value)} />
                </Field>
              )}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPhoto(f);
                setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
              }}
            />
            {photo ? (
              <div className="flex items-center gap-3">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Fiş" className="size-20 rounded-lg object-cover" />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-lg bg-surface-2 text-xs">PDF</div>
                )}
                <span className="flex-1 truncate text-sm">{photo.name}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => { setPhoto(null); setPreview(null); }} aria-label="Kaldır">
                  <X />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <Camera /> Fiş fotoğrafı ekle
              </Button>
            )}
          </CardBody>
        </Card>

        {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
        <Button type="submit" size="lg" loading={busy}>
          Kaydet
        </Button>
      </form>
    </div>
  );
}
