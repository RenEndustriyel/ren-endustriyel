"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, RefreshCw } from "lucide-react";
import { useAccounts, useContacts } from "@/lib/data";
import { formatMoney, isoDate } from "@/lib/format";
import { exportExcel, sheet } from "@/lib/excel";
import { AUDIT_ACTION_LABELS, AUDIT_CATEGORY_LABELS, fetchAuditFeed, fetchUserNames, type AuditAction, type AuditCategory, type AuditEntry } from "@/lib/audit-feed";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { SearchInput, matches } from "@/components/ui/search-input";
import { DataTable } from "@/components/ui/data-table";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";

const MAX_DAYS = 31;
const timeOf = (iso: string) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const ACTION_TONE: Record<AuditAction, string> = {
  create: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  update: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  delete: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  restore: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
};

/**
 * İşlem Geçmişi: kim, ne zaman, hangi hesapta/kayıtta ne yaptı.
 * Kayıtları veritabanı kendisi tutar (her ekleme, değiştirme ve silme); bu ekran yalnızca okur, hiçbir kaydı değiştirmez.
 */
export function ActivityLog({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { org } = useOrg();
  const accounts = useAccounts();
  const contacts = useContacts();
  const today = isoDate();
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);
  const [category, setCategory] = React.useState<AuditCategory | "all">("all");
  const [action, setAction] = React.useState<AuditAction | "all">("all");
  const [accountId, setAccountId] = React.useState("all");
  const [userId, setUserId] = React.useState("all");
  const [q, setQ] = React.useState("");

  const validRange = !!from && !!to && from <= to;
  const days = validRange ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1 : 0;
  const tooLong = days > MAX_DAYS;
  const ready = !!org?.id && validRange && !tooLong && !!accounts.data && !!contacts.data;

  const feed = useQuery({
    queryKey: ["audit-feed", org?.id, from, to, accounts.data?.length, contacts.data?.length],
    enabled: ready,
    staleTime: 30_000,
    queryFn: async () => {
      const look = {
        accounts: new Map((accounts.data ?? []).map((a) => [a.id, a.name])),
        contacts: new Map((contacts.data ?? []).map((c) => [c.id, c.name])),
      };
      // gün sınırları bu cihazın saatine göre
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      const res = await fetchAuditFeed(org!.id, start.toISOString(), end.toISOString(), look);
      const users = await fetchUserNames([...new Set(res.entries.map((e) => e.userId).filter((u): u is string => !!u))]);
      return { ...res, users };
    },
  });

  const entries = React.useMemo(() => feed.data?.entries ?? [], [feed.data]);
  const users = feed.data?.users;
  const userName = React.useCallback((id: string | null) => (id ? users?.get(id) ?? "Kullanıcı" : "Sistem"), [users]);
  const accountName = React.useCallback((id: string | null) => (id ? accounts.data?.find((a) => a.id === id)?.name ?? "Silinmiş hesap" : ""), [accounts.data]);

  const rows = React.useMemo(
    () =>
      entries.filter((e) => {
        if (category !== "all" && e.category !== category) return false;
        if (action !== "all" && e.action !== action) return false;
        if (accountId !== "all" && e.accountId !== accountId) return false;
        if (userId !== "all" && (e.userId ?? "sistem") !== userId) return false;
        if (q.trim() && !matches(`${e.title} ${e.detail} ${userName(e.userId)} ${accountName(e.accountId)}`, q)) return false;
        return true;
      }),
    [entries, category, action, accountId, userId, q, userName, accountName],
  );

  const count = (a: AuditAction) => rows.filter((e) => e.action === a).length;
  const userIds = React.useMemo(() => [...new Set(entries.map((e) => e.userId ?? "sistem"))], [entries]);
  const periodText = from === to ? new Date(`${from}T00:00:00`).toLocaleDateString("tr-TR") : `${new Date(`${from}T00:00:00`).toLocaleDateString("tr-TR")} – ${new Date(`${to}T00:00:00`).toLocaleDateString("tr-TR")}`;
  const balanceText = (e: AuditEntry) => (e.balanceBefore === null || e.balanceAfter === null ? "" : `${formatMoney(e.balanceBefore, e.currency)} → ${formatMoney(e.balanceAfter, e.currency)}`);

  const handleExcel = () =>
    exportExcel(`islem-gecmisi-${from}${from === to ? "" : `_${to}`}`, [
      sheet<AuditEntry>({
        name: "İşlem Geçmişi",
        rows,
        columns: [
          { header: "Tarih / Saat", value: (e) => timeOf(e.at), width: 20 },
          { header: "Kullanıcı", value: (e) => userName(e.userId), width: 20 },
          { header: "Tür", value: (e) => AUDIT_CATEGORY_LABELS[e.category], width: 20 },
          { header: "İşlem", value: (e) => e.title, width: 28 },
          { header: "Ayrıntı", value: (e) => e.detail, width: 70 },
          { header: "Hesap", value: (e) => accountName(e.accountId), width: 22 },
          { header: "Tutar", value: (e) => e.amount ?? "", type: "money" },
          { header: "Bakiye (önce)", value: (e) => e.balanceBefore ?? "", type: "money" },
          { header: "Bakiye (sonra)", value: (e) => e.balanceAfter ?? "", type: "money" },
        ],
      }),
    ]);

  const handlePdf = async () => {
    if (!org) return;
    const { shareListPdf } = await import("@/lib/pdf/share");
    await shareListPdf({
      org,
      title: "İşlem Geçmişi",
      subtitle: `${periodText} · ${rows.length} işlem`,
      fileName: `islem-gecmisi-${from}`,
      orientation: "landscape",
      mode: "download",
      columns: [
        { header: "Tarih / Saat", width: "13%" },
        { header: "Kullanıcı", width: "12%" },
        { header: "İşlem", width: "17%" },
        { header: "Ayrıntı", width: "32%" },
        { header: "Tutar", width: "10%", align: "right" },
        { header: "Bakiye (önce → sonra)", width: "16%", align: "right" },
      ],
      rows: rows.map((e) => [timeOf(e.at), userName(e.userId), e.title, [accountName(e.accountId), e.detail].filter(Boolean).join(" · ").slice(0, 220), e.amount === null ? "" : formatMoney(e.amount, e.currency), balanceText(e)]),
      summary: [{ label: "Toplam İşlem", value: `${rows.length} adet` }],
    });
  };

  return (
    <div className={cn(!embedded && "mx-auto max-w-7xl")}>
      {!embedded && <PageHeader title="İşlem Geçmişi" description="Kim, ne zaman, hangi hesapta ne yaptı. Kayıtlar silinemez." />}

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Başlangıç
          <Input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className="mt-1 block w-40" />
        </label>
        <label className="text-xs text-muted">
          Bitiş
          <Input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className="mt-1 block w-40" />
        </label>
        <Button size="sm" variant="outline" onClick={() => { setFrom(today); setTo(today); }}>
          Bugün
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            setFrom(isoDate(d));
            setTo(isoDate(d));
          }}
        >
          Dün
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() - 6);
            setFrom(isoDate(d));
            setTo(today);
          }}
        >
          Son 7 gün
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => feed.refetch()} disabled={feed.isFetching} title="Kayıtları yeniden oku">
            <RefreshCw className={cn(feed.isFetching && "animate-spin")} /> Yenile
          </Button>
          <Button size="sm" variant="outline" onClick={handlePdf} disabled={!rows.length}>
            <FileText /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleExcel} disabled={!rows.length}>
            <Download /> Excel
          </Button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <NativeSelect value={category} onChange={(e) => setCategory(e.target.value as AuditCategory | "all")} aria-label="Tür">
          <option value="all">Tüm türler</option>
          {(Object.keys(AUDIT_CATEGORY_LABELS) as AuditCategory[]).map((c) => (
            <option key={c} value={c}>
              {AUDIT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Hesap">
          <option value="all">Tüm hesaplar</option>
          {(accounts.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={action} onChange={(e) => setAction(e.target.value as AuditAction | "all")} aria-label="İşlem">
          <option value="all">Tüm işlemler</option>
          {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_LABELS[a]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="Kullanıcı">
          <option value="all">Tüm kullanıcılar</option>
          {userIds.map((u) => (
            <option key={u} value={u}>
              {userName(u === "sistem" ? null : u)}
            </option>
          ))}
        </NativeSelect>
        <SearchInput value={q} onChange={setQ} placeholder="Ara: cari, belge no, açıklama…" className="col-span-2 lg:col-span-1" />
      </div>

      {!validRange ? (
        <p className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-danger">Başlangıç tarihi bitişten sonra olamaz.</p>
      ) : tooLong ? (
        <p className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-danger">En fazla {MAX_DAYS} günlük aralık seçilebilir.</p>
      ) : feed.isError ? (
        <p className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-danger">
          Kayıtlar okunamadı: {(feed.error as { message?: string })?.message ?? "bilinmeyen hata"}. Daha kısa bir tarih aralığı deneyin.
        </p>
      ) : null}
      {feed.data?.truncated && (
        <p className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-warning">Bu aralıkta çok fazla kayıt var; liste eksik. Daha kısa bir tarih aralığı seçin.</p>
      )}
      {feed.data?.docUpdatesTruncated && (
        <p className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-warning">
          Bu tarihlerde otomatik eşleştirme çok fazla kayıt üretmiş; belge <b>düzenleme</b> satırlarının bir kısmı gösterilemiyor. Kasa/banka hareketleri, hesap, cari, ürün işlemleri ile belge ekleme ve silmeler eksiksizdir.
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Toplam işlem · ${periodText}`} value={rows.length} currency={null} />
        <Stat label="Ekleme" value={count("create")} currency={null} tone="success" />
        <Stat label="Değiştirme" value={count("update")} currency={null} tone="warning" />
        <Stat label="Silme" value={count("delete")} currency={null} tone="danger" />
      </div>

      <DataTable
        rows={rows}
        loading={ready && feed.isPending}
        rowKey={(e) => e.id}
        pageSize={100}
        emptyMessage="Bu aralıkta kayıt yok."
        onRowClick={(e) => e.href && router.push(e.href)}
        columns={[
          { key: "at", header: "Tarih / Saat", sortValue: (e) => e.at, cell: (e) => <span className="num whitespace-nowrap text-xs">{timeOf(e.at)}</span> },
          { key: "user", header: "Kullanıcı", hideBelow: "md", sortValue: (e) => userName(e.userId), cell: (e) => <span className="text-xs">{userName(e.userId)}</span> },
          {
            key: "what",
            header: "İşlem",
            sortValue: (e) => e.title,
            cell: (e) => (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", ACTION_TONE[e.action])}>{AUDIT_ACTION_LABELS[e.action]}</span>
                  <span className="font-medium">{e.title}</span>
                </div>
                <div className="mt-0.5 break-words text-xs text-muted">{e.detail}</div>
              </div>
            ),
          },
          { key: "account", header: "Hesap", hideBelow: "lg", sortValue: (e) => accountName(e.accountId), cell: (e) => <span className="text-xs">{accountName(e.accountId)}</span> },
          {
            key: "amount",
            header: "Tutar",
            align: "right",
            sortValue: (e) => e.amount ?? 0,
            cell: (e) => (e.amount === null ? null : <span className={cn("num whitespace-nowrap font-semibold", e.category === "cash" || e.category === "account" ? (e.amount >= 0 ? "text-success" : "text-danger") : "")}>{formatMoney(e.amount, e.currency)}</span>),
          },
          { key: "balance", header: "Bakiye (önce → sonra)", align: "right", hideBelow: "md", cell: (e) => <span className="num whitespace-nowrap text-xs">{balanceText(e)}</span> },
        ]}
      />
    </div>
  );
}
