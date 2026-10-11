"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Upload, Download, Users, Phone, Printer, FileText } from "lucide-react";
import { useContacts, useContactBalances, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput, matches } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { ContactImport } from "./contact-import";

type Contact = Row<"contacts"> & { balance: number };

export function ContactsList({ kind }: { kind: "customer" | "supplier" }) {
  const router = useRouter();
  const { org, canWrite } = useOrg();
  const contacts = useContacts();
  const balances = useContactBalances();
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "debit" | "credit">("all");
  const [importOpen, setImportOpen] = React.useState(false);
  const isCustomer = kind === "customer";
  const base = isCustomer ? "/cariler/musteriler" : "/cariler/tedarikciler";

  const rows = React.useMemo(() => {
    const bal = new Map((balances.data ?? []).map((b) => [b.contact_id, Number(b.balance)]));
    return (contacts.data ?? [])
      .filter((c) => c.kind === kind || c.kind === "both")
      .map((c) => ({ ...c, balance: bal.get(c.id) ?? Number(c.opening_balance ?? 0) }));
  }, [contacts.data, balances.data, kind]);

  const filtered = rows.filter(
    (c) =>
      matches(`${c.name} ${c.code ?? ""} ${c.tax_number ?? ""} ${c.city ?? ""} ${c.phone ?? ""} ${c.mobile ?? ""} ${(c.tags ?? []).join(" ")}`, q) &&
      (filter === "all" || (filter === "debit" ? c.balance > 0.004 : c.balance < -0.004)),
  );

  const totalDebit = rows.reduce((s, c) => s + Math.max(c.balance, 0), 0);
  const totalCredit = rows.reduce((s, c) => s + Math.max(-c.balance, 0), 0);

  const balanceCell = (b: number) => (
    <span className={cn("num font-semibold", b > 0.004 ? "text-success" : b < -0.004 ? "text-danger" : "text-muted")}>
      {formatMoney(Math.abs(b))}
      <span className="ml-1 text-[10px] font-medium uppercase">{b > 0.004 ? "(B)" : b < -0.004 ? "(A)" : ""}</span>
    </span>
  );

  const columns: Column<Contact>[] = [
    {
      key: "name",
      header: "Unvan",
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="min-w-0">
          <div className="font-medium">{c.name}</div>
          <div className="text-xs text-muted">
            {[c.code, c.tax_number, [c.district, c.city].filter(Boolean).join("/")].filter(Boolean).join(" · ")}
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Telefon", hideBelow: "md", cell: (c) => <span className="text-muted">{c.mobile || c.phone}</span> },
    { key: "kind", header: "Tür", hideBelow: "lg", cell: (c) => <span className="text-xs text-muted">{c.kind === "both" ? "Müşteri + Tedarikçi" : c.kind === "customer" ? "Müşteri" : "Tedarikçi"}</span> },
    { key: "balance", header: "Bakiye", align: "right", sortValue: (c) => c.balance, cell: (c) => balanceCell(c.balance) },
  ];

  const exportRows = () =>
    exportExcel(isCustomer ? "musteriler" : "tedarikciler", [
      {
        name: isCustomer ? "Müşteriler" : "Tedarikçiler",
        rows: filtered,
        columns: [
          { header: "Unvan", value: (c) => c.name, width: 36 },
          { header: "Kod", value: (c) => c.code },
          { header: "VKN/TCKN", value: (c) => c.tax_number },
          { header: "Vergi dairesi", value: (c) => c.tax_office },
          { header: "Telefon", value: (c) => c.phone },
          { header: "Cep", value: (c) => c.mobile },
          { header: "E-posta", value: (c) => c.email },
          { header: "Adres", value: (c) => c.address, width: 40 },
          { header: "İlçe", value: (c) => c.district },
          { header: "İl", value: (c) => c.city },
          { header: "Bakiye (+borçlu / -alacaklı)", value: (c) => c.balance, type: "money" },
        ],
      },
    ]);

  const handlePdf = async (mode: "download" | "open") => {
    if (!org) return;
    const { shareListPdf } = await import("@/lib/pdf/share");
    const listTitle = isCustomer ? "MÜŞTERİ LİSTESİ" : "TEDARİKÇİ LİSTESİ";
    const totalBalance = filtered.reduce((s, c) => s + (c.balance || 0), 0);
    await shareListPdf({
      org,
      title: listTitle,
      subtitle: `${filtered.length} Kayıt`,
      orientation: "landscape",
      fileName: isCustomer ? "musteriler" : "tedarikciler",
      mode,
      columns: [
        { header: "Unvan", width: "28%" },
        { header: "VKN / TCKN", width: "14%" },
        { header: "Telefon", width: "14%" },
        { header: "İl / İlçe", width: "16%" },
        { header: "Tür", width: "14%" },
        { header: "Bakiye", width: "14%", align: "right" },
      ],
      rows: filtered.map((c) => [
        c.name,
        c.tax_number || "—",
        c.mobile || c.phone || "—",
        [c.district, c.city].filter(Boolean).join(" / ") || "—",
        c.kind === "both" ? "Müşteri + Tedarikçi" : c.kind === "customer" ? "Müşteri" : "Tedarikçi",
        formatMoney(c.balance, "TRY"),
      ]),
      summary: [
        { label: "Toplam Cari Sayısı", value: `${filtered.length} adet` },
        { label: "Toplam Net Bakiye", value: `${totalBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺` },
      ],
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={isCustomer ? "Müşteriler" : "Tedarikçiler"}
        description={`${rows.length} kayıt`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePdf("open")}
              title="Cari listesini yeni sekmede aç ve yazdır"
            >
              <Printer className="size-4" /> <span className="hidden sm:inline">Yazdır / Görüntüle</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePdf("download")}
              title="Cari listesini PDF olarak indir"
            >
              <FileText className="size-4" /> <span className="hidden sm:inline">PDF İndir</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportRows}>
              <Download /> <span className="hidden sm:inline">Excel</span>
            </Button>
            {canWrite && (
              <>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload /> <span className="hidden sm:inline">İçe aktar</span>
                </Button>
                <Button asChild size="sm">
                  <Link href={`${base}/yeni`}>
                    <Plus /> Yeni {isCustomer ? "müşteri" : "tedarikçi"}
                  </Link>
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Toplam alacak (bize borçlu)" value={totalDebit} tone="success" />
        <Stat label="Toplam borç (biz borçluyuz)" value={totalCredit} tone="danger" />
        <Stat label="Net" value={totalDebit - totalCredit} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Unvan, VKN, telefon, şehir…" className="sm:max-w-sm sm:flex-1" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tümü" },
            { value: "debit", label: "Borçlu" },
            { value: "credit", label: "Alacaklı" },
          ]}
        />
      </div>

      <DataTable
        rows={filtered}
        loading={contacts.isPending}
        columns={columns}
        rowKey={(c) => c.id}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(c) => router.push(`/cariler/detay?id=${c.id}`)}
        mobileRow={(c) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{c.name}</div>
              <div className="flex items-center gap-1 truncate text-xs text-muted">
                {(c.mobile || c.phone) && <Phone className="size-3" />}
                {c.mobile || c.phone || c.city}
              </div>
            </div>
            {balanceCell(c.balance)}
          </div>
        )}
        empty={
          <EmptyState
            icon={<Users />}
            title={q ? "Sonuç bulunamadı" : `Henüz ${isCustomer ? "müşteri" : "tedarikçi"} yok`}
            description={q ? undefined : "Yeni kayıt ekleyin veya Excel'den içe aktarın."}
          />
        }
      />
      <p className="mt-2 text-xs text-muted">(B) borçlu: cari size borçlu · (A) alacaklı: siz cariye borçlusunuz</p>
      <ContactImport open={importOpen} onOpenChange={setImportOpen} kind={kind} />
    </div>
  );
}
