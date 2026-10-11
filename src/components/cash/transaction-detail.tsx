"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useUpdate, type Row } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { TYPE_LABELS } from "@/components/dashboard/types";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/confirm";

type Txn = Row<"transactions"> & {
  contact: { id: string; name: string } | null;
  employee: { id: string; name: string } | null;
  account: { name: string } | null;
  to_account: { name: string } | null;
  category: { name: string } | null;
  allocations: { amount: number; document: { id: string; doc_type: string; number: string | null; currency: string } | null }[];
};

export function TransactionDetail({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { canWrite } = useOrg();
  const { remove } = useUpdate("transactions");
  const q = useQuery({
    queryKey: ["txn", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "*, contact:contacts(id, name), employee:employees(id, name), account:accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name), category:categories(name), allocations:payment_allocations(amount, document:documents(id, doc_type, number, currency))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Txn | null;
    },
  });
  const t = q.data;
  if (q.isPending) return <Skeleton className="mx-auto h-64 max-w-3xl rounded-card" />;
  if (!t || t.deleted_at) return <EmptyState title="İşlem bulunamadı" />;
  const system = ["cheque_in", "cheque_out", "cheque_collect", "cheque_pay"].includes(t.type) || (t.type === "adjustment" && t.cheque_id);

  const del = async () => {
    if (!(await confirm({ title: "İşlem silinsin mi?", description: "Hesap bakiyesi ve bağlı belgelerin ödeme durumu güncellenir.", danger: true, confirmText: "Sil" }))) return;
    await remove(t.id, "İşlem silindi");
    router.back();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back
        title={TYPE_LABELS[t.type] ?? t.type}
        description={formatDate(t.txn_date)}
        actions={
          canWrite &&
          !system && (
            <>
              <Button asChild size="sm" variant="outline">
                <Link href={`/nakit/hareketler/duzenle?id=${t.id}`}>
                  <Pencil /> Düzenle
                </Link>
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={del} aria-label="Sil">
                <Trash2 />
              </Button>
            </>
          )
        }
      />
      <Card className="mb-4">
        <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Tutar" value={<span className="num text-lg font-bold">{formatMoney(t.amount, t.currency)}</span>} />
          {t.currency !== "TRY" && <Info label="TL karşılığı" value={formatMoney(t.amount_try)} />}
          <Info label={t.direction === "transfer" ? "Çıkış hesabı" : "Hesap"} value={t.account?.name ?? "Portföy (çek/senet)"} />
          {t.direction === "transfer" && <Info label="Giriş hesabı" value={`${t.to_account?.name} · ${formatMoney(t.to_amount ?? t.amount)}`} />}
          {t.contact && <Info label="Cari" value={<Link className="text-primary hover:underline" href={`/cariler/detay?id=${t.contact.id}`}>{t.contact.name}</Link>} />}
          {t.employee && <Info label="Çalışan" value={<Link className="text-primary hover:underline" href={`/giderler/calisanlar/calisan?id=${t.employee.id}`}>{t.employee.name}</Link>} />}
          {t.category && <Info label="Kategori" value={t.category.name} />}
          {t.description && <Info label="Açıklama" value={t.description} />}
          {t.reference && <Info label="Referans" value={t.reference} />}
        </CardBody>
      </Card>
      {!!t.allocations?.length && (
        <Card>
          <CardHeader title="Eşleşen belgeler" />
          <ul className="divide-y divide-border text-sm">
            {t.allocations.filter((a) => a.document).map((a) => (
              <li key={a.document!.id}>
                <Link href={`${DOC_TYPES[a.document!.doc_type as DocType].base}/detay?id=${a.document!.id}`} className="flex justify-between px-4 py-2.5 hover:bg-surface-2">
                  <span>
                    {DOC_TYPES[a.document!.doc_type as DocType].label} {a.document!.number}
                  </span>
                  <span className="num font-semibold">{formatMoney(a.amount, a.document!.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {system && <p className="mt-3 text-xs text-muted">Bu hareket çek/senet işleminden otomatik oluşturuldu; Çek & Senet sayfasından yönetin.</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div>{value}</div>
    </div>
  );
}
