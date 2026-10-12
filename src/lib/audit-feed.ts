"use client";

import { supabase } from "./supabase/client";
import { formatDate, formatMoney } from "./format";
import { DOC_TYPES, type DocType } from "./doc-types";
import { TYPE_LABELS } from "@/components/dashboard/types";

/**
 * İşlem geçmişi: veritabanındaki audit_log kayıtlarını (her ekleme/değiştirme/silme, kim ve ne zaman)
 * okunur satırlara çevirir. Kayıtları veritabanı tetikleyicisi yazar; uygulama yalnızca okur.
 */

export type AuditCategory = "cash" | "account" | "document" | "contact" | "product" | "other";
export type AuditAction = "create" | "update" | "delete" | "restore";

export type AuditEntry = {
  id: string;
  at: string;
  userId: string | null;
  category: AuditCategory;
  action: AuditAction;
  title: string;
  detail: string;
  /** giriş +, çıkış − (yalnızca para hareketlerinde) */
  amount: number | null;
  currency: string;
  accountId: string | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
  href: string | null;
};

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  cash: "Kasa / banka hareketi",
  account: "Hesap",
  document: "Belge",
  contact: "Cari",
  product: "Ürün",
  other: "Diğer",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Ekleme",
  update: "Değiştirme",
  delete: "Silme",
  restore: "Geri alma",
};

type Json = Record<string, unknown>;
type RawRow = {
  id: number;
  created_at: string;
  table_name: string;
  action: string;
  user_id: string | null;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
};

export type AuditLookups = { accounts: Map<string, string>; contacts: Map<string, string> };

const PAGE = 1000;
/** Belge güncellemelerinde 3 saatlik dilim başına okunacak en fazla sayfa (500'er kayıt; eski günlerde otomatik eşleştirme kayıtları çok fazla) */
const DOC_UPDATE_MAX_PAGES = 4;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Yeniden eskiye sayfa sayfa okur. Sayfa atlamak (offset) yerine son okunan anın öncesinden devam eder:
 * tablo büyük olduğu için derin offset sorguları zaman aşımına uğruyor. Aynı ana düşen kayıtlar kimlikle ayıklanır.
 */
async function fetchAll<T extends { id: number; created_at: string }>(
  build: () => any, // eslint-disable-line @typescript-eslint/no-explicit-any
  maxPages = 50,
  /** true: sorgu hata verirse (zaman aşımı) o ana kadar okunanla yetinilir ve "eksik" diye işaretlenir */
  tolerant = false,
  pageSize = PAGE,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  let cursor: { at: string; ids: number[] } | null = null;
  for (let page = 0; page < maxPages; page++) {
    let q = build();
    if (cursor) {
      q = q.lte("created_at", cursor.at);
      if (cursor.ids.length) q = q.not("id", "in", `(${cursor.ids.join(",")})`);
    }
    const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize);
    if (error) {
      if (tolerant) return { rows, truncated: true };
      throw error;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) return { rows, truncated: false };
    const at = batch[batch.length - 1].created_at;
    cursor = { at, ids: rows.filter((r) => r.created_at === at).map((r) => r.id) };
  }
  return { rows, truncated: true };
}

/** Zaman aralığını eşit dilimlere böler (yoğun günlerde dilimler paralel okunur) */
function slices(fromIso: string, toIso: string, hours = 3): [string, string][] {
  const out: [string, string][] = [];
  const end = Date.parse(toIso);
  for (let t = Date.parse(fromIso); t < end; t += hours * 3600_000) out.push([new Date(t).toISOString(), new Date(Math.min(t + hours * 3600_000, end)).toISOString()]);
  return out;
}

/**
 * Bir zaman aralığını eksiksiz okur. Sorgu zaman aşımına uğrarsa (o aralıkta taranacak kayıt çok fazla)
 * aralığı ikiye bölüp yeniden dener; 10 dakikanın altına inince hatayı yukarı verir.
 */
async function fetchRange<T extends { id: number; created_at: string }>(
  build: (f: string, t: string) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
  f: string,
  t: string,
): Promise<{ rows: T[]; truncated: boolean }> {
  try {
    return await fetchAll<T>(() => build(f, t));
  } catch (e) {
    const span = Date.parse(t) - Date.parse(f);
    if ((e as { code?: string })?.code !== "57014" || span <= 10 * 60_000) throw e;
    const mid = new Date(Date.parse(f) + span / 2).toISOString();
    // yeniden eskiye sırayı korumak için önce yeni yarı
    const late = await fetchRange<T>(build, mid, t);
    const early = await fetchRange<T>(build, f, mid);
    return { rows: [...late.rows, ...early.rows], truncated: late.truncated || early.truncated };
  }
}

async function pool<A, R>(items: A[], size: number, fn: (a: A) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const ACTION: Record<string, AuditAction> = { INSERT: "create", UPDATE: "update", DELETE: "delete", RESTORE: "restore" };
const VERB: Record<AuditAction, string> = { create: "eklendi", update: "değiştirildi", delete: "silindi", restore: "geri alındı" };
const IGNORED = new Set(["updated_at", "created_at", "search", "search_text", "fts"]);
const MONEY_KEYS = new Set(["amount", "amount_try", "total", "balance", "opening_balance", "purchase_price", "sale_price", "paid_amount", "card_limit", "net_total", "discount_value", "salary"]);

const STATUS_TR: Record<string, string> = { draft: "Taslak", pending: "Beklemede", approved: "Onaylı", sent: "Gönderildi", accepted: "Onaylandı", rejected: "Reddedildi", converted: "Dönüştürüldü", cancelled: "İptal" };

type Labels = Record<string, string>;

function show(key: string, v: unknown, look: AuditLookups, currency: string): string {
  if (v === null || v === undefined || v === "") return "boş";
  if (key === "account_id" || key === "to_account_id") return look.accounts.get(String(v)) ?? "hesap";
  if (key === "contact_id") return look.contacts.get(String(v)) ?? "cari";
  if (key === "type") return TYPE_LABELS[String(v)] ?? String(v);
  if (key === "direction") return v === "in" ? "Giriş" : v === "out" ? "Çıkış" : String(v);
  if (key === "status") return STATUS_TR[String(v)] ?? String(v);
  if (typeof v === "boolean") return v ? "Evet" : "Hayır";
  if (MONEY_KEYS.has(key)) return formatMoney(Number(v), currency);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDate(v);
  if (typeof v === "object") return "…";
  return String(v);
}

/** Etiketi bilinen alanlardaki değişiklikleri "Alan: eski → yeni" olarak yazar; bilinmeyen alanlar adıyla sayılır */
function diffText(o: Json | null, n: Json | null, labels: Labels, look: AuditLookups, skip: Set<string>, currency = "TRY"): string[] {
  const out: string[] = [];
  const other: string[] = [];
  for (const k of Object.keys({ ...o, ...n })) {
    if (IGNORED.has(k) || skip.has(k)) continue;
    if (JSON.stringify(o?.[k] ?? null) === JSON.stringify(n?.[k] ?? null)) continue;
    if (labels[k]) out.push(`${labels[k]}: ${show(k, o?.[k], look, currency)} → ${show(k, n?.[k], look, currency)}`);
    else other.push(k);
  }
  if (other.length) out.push(`Diğer alanlar: ${other.join(", ")}`);
  return out;
}

const TXN_LABELS: Labels = { amount: "Tutar", txn_date: "Tarih", account_id: "Hesap", to_account_id: "Karşı hesap", contact_id: "Cari", description: "Açıklama", type: "Tür", direction: "Yön", method: "Yöntem", reference: "Referans", currency: "Para birimi" };
const ACCOUNT_LABELS: Labels = { name: "Ad", type: "Tür", currency: "Para birimi", iban: "IBAN", bank_name: "Banka", is_active: "Aktif", card_limit: "Kart limiti", balance: "Bakiye" };
const CONTACT_LABELS: Labels = { name: "Unvan", code: "Kod", kind: "Tür", phone: "Telefon", mobile: "Cep", email: "E-posta", address: "Adres", district: "İlçe", city: "İl", tax_number: "VKN/TCKN", tax_office: "Vergi dairesi", opening_balance: "Açılış bakiyesi", contact_person: "Yetkili" };
const PRODUCT_LABELS: Labels = { name: "Ad", code: "Kod", barcode: "Barkod", purchase_price: "Alış fiyatı", sale_price: "Satış fiyatı", vat_rate: "KDV %", critical_stock: "Kritik stok", is_active: "Aktif", track_stock: "Stok takibi", purchase_price_includes_vat: "Alış fiyatı KDV dahil", sale_price_includes_vat: "Satış fiyatı KDV dahil", image_path: "Resim", description: "Açıklama" };
/** Stok hareketlerinin kendiliğinden güncellediği alanlar: tek başına değiştiyse kullanıcı işlemi değildir */
const PRODUCT_DERIVED = new Set(["stock_qty", "avg_cost", "last_purchase_price", "last_purchase_date", "last_sale_date"]);
const DOC_LABELS: Labels = { number: "Numara", total: "Toplam", issue_date: "Tarih", due_date: "Vade", contact_id: "Cari", status: "Durum" };
const OTHER_TABLES: Record<string, string> = { cheques: "Çek / senet", employees: "Personel", stock_transfers: "Depo transferi" };
/** audit tetikleyicisi olan, belge dışındaki tablolar */
const OTHER_TABLE_NAMES = ["transactions", "accounts", "contacts", "products", "cheques", "employees", "stock_transfers"];

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export async function fetchAuditFeed(
  orgId: string,
  fromIso: string,
  toIso: string,
  look: AuditLookups,
): Promise<{ entries: AuditEntry[]; /** kayıt sayısı sınırı aşıldı */ truncated: boolean; /** yalnızca belge düzenleme satırları eksik olabilir */ docUpdatesTruncated: boolean }> {
  const full = "id, created_at, table_name, action, user_id, record_id, old_data, new_data";
  // Her alan okuması satır başına maliyetli (jsonb açılıyor): yalnızca karşılaştırılacak alanlar istenir, belge adı/türü sonra ayrıca okunur
  const docUpdateCols = "id, created_at, user_id, record_id," + Object.keys(DOC_LABELS).map((k) => `o_${k}:old_data->${k}, n_${k}:new_data->${k}`).join(",");
  type DocUpdateRow = Json & { id: number; created_at: string };

  // Önce asıl kayıtlar (hareket, hesap, cari, ürün, belge ekleme/silme): bunlar eksiksiz okunmalı.
  // Ağır olan belge-güncelleme taraması sonra çalışır ki bu sorguları yavaşlatıp zaman aşımına düşürmesin.
  const merge = (parts: { rows: RawRow[]; truncated: boolean }[]) => ({ rows: parts.flatMap((p) => p.rows), truncated: parts.some((p) => p.truncated) });
  const sixHours = slices(fromIso, toIso, 6);
  const others = merge(
    await pool(sixHours, 3, ([f, t]) =>
      fetchRange<RawRow>((a, b) => db.from("audit_log").select(full).eq("org_id", orgId).gte("created_at", a).lt("created_at", b).in("table_name", OTHER_TABLE_NAMES), f, t),
    ),
  );
  const docEvents = merge(
    await pool(sixHours, 3, ([f, t]) =>
      fetchRange<RawRow>(
        (a, b) => db.from("audit_log").select(full).eq("org_id", orgId).gte("created_at", a).lt("created_at", b).eq("table_name", "documents").in("action", ["INSERT", "DELETE", "RESTORE"]),
        f,
        t,
      ),
    ),
  );
  // Belge güncellemelerinin çoğu otomatik "ödendi tutarı" yenilemesidir: yalnızca gereken alanlar okunur, gerçek değişiklikler aşağıda ayıklanır.
  // Otomatik kayıtlarla dolmuş dilimler 5 saniyede ya da sınırda kesilir (docUpdatesTruncated).
  const docUpdateParts = await pool(slices(fromIso, toIso), 2, ([f, t]) =>
    fetchAll<DocUpdateRow>(
      () =>
        db
          .from("audit_log")
          .select(docUpdateCols)
          .eq("org_id", orgId)
          .gte("created_at", f)
          .lt("created_at", t)
          .eq("table_name", "documents")
          .eq("action", "UPDATE")
          .abortSignal(AbortSignal.timeout(5000)),
      DOC_UPDATE_MAX_PAGES,
      true,
      500,
    ),
  );
  const docUpdates = { rows: docUpdateParts.flatMap((p) => p.rows) };
  const docUpdatesTruncated = docUpdateParts.some((p) => p.truncated);

  const entries: AuditEntry[] = [];
  const blank = { amount: null, currency: "TRY", accountId: null, balanceBefore: null, balanceAfter: null, href: null };

  // Hesap bakiyesi değişimleri: aynı veritabanı işleminde (aynı an) oluşan hareket satırına "önce → sonra" olarak eklenir
  const balances = new Map<string, { before: number; after: number; used: boolean; row: RawRow }>();
  const accountRows = others.rows.filter((r) => r.table_name === "accounts").sort((a, b) => a.id - b.id);
  for (const r of accountRows) {
    if (r.action !== "UPDATE" || Number(r.old_data?.balance) === Number(r.new_data?.balance)) continue;
    const k = `${r.created_at}|${r.record_id}`;
    const cur = balances.get(k);
    if (cur) cur.after = Number(r.new_data?.balance);
    else balances.set(k, { before: Number(r.old_data?.balance), after: Number(r.new_data?.balance), used: false, row: r });
  }

  for (const r of others.rows) {
    const action = ACTION[r.action] ?? "update";
    const d = (r.new_data ?? r.old_data ?? {}) as Json;
    const common = { id: String(r.id), at: r.created_at, userId: r.user_id, action };

    if (r.table_name === "transactions") {
      const currency = s(d.currency) || "TRY";
      const changes = action === "update" ? diffText(r.old_data, r.new_data, TXN_LABELS, look, new Set(["amount_try", "exchange_rate", "deleted_at"]), currency) : [];
      if (action === "update" && !changes.length) continue;
      const label = TYPE_LABELS[s(d.type)] ?? "Hareket";
      const accountId = s(d.account_id) || null;
      const bal = accountId ? balances.get(`${r.created_at}|${accountId}`) : undefined;
      if (bal) bal.used = true;
      const toBal = d.to_account_id ? balances.get(`${r.created_at}|${s(d.to_account_id)}`) : undefined;
      if (toBal) toBal.used = true;
      const sign = d.direction === "out" ? -1 : 1;
      entries.push({
        ...common,
        category: "cash",
        title: `${label} ${VERB[action]}`,
        detail: [
          action === "update" ? changes.join(" · ") : null,
          accountId ? look.accounts.get(accountId) ?? "Hesap" : null,
          d.to_account_id ? `→ ${look.accounts.get(s(d.to_account_id)) ?? "hesap"}` : null,
          d.contact_id ? look.contacts.get(s(d.contact_id)) ?? null : null,
          s(d.description) || null,
          d.txn_date ? `işlem tarihi ${formatDate(s(d.txn_date))}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        amount: sign * Number(d.amount ?? 0) * (action === "delete" ? -1 : 1),
        currency,
        accountId,
        balanceBefore: bal?.before ?? null,
        balanceAfter: bal?.after ?? null,
        href: accountId ? `/nakit/hesaplar/detay?id=${accountId}` : null,
      });
    } else if (r.table_name === "accounts") {
      if (action === "update") {
        const changes = diffText(r.old_data, r.new_data, ACCOUNT_LABELS, look, new Set(["balance", "deleted_at"]), s(d.currency) || "TRY");
        if (!changes.length) continue; // bakiye değişimi aşağıda/hareket satırında gösterilir
        entries.push({ ...common, ...blank, category: "account", title: "Hesap düzenlendi", detail: `${s(d.name)} · ${changes.join(" · ")}`, accountId: r.record_id, href: `/nakit/hesaplar/detay?id=${r.record_id}` });
      } else {
        entries.push({ ...common, ...blank, category: "account", title: `Hesap ${action === "create" ? "açıldı" : VERB[action]}`, detail: `${s(d.name)} · bakiye ${formatMoney(Number(d.balance ?? 0), s(d.currency) || "TRY")}`, accountId: r.record_id, currency: s(d.currency) || "TRY", href: `/nakit/hesaplar/detay?id=${r.record_id}` });
      }
    } else if (r.table_name === "contacts") {
      const changes = action === "update" ? diffText(r.old_data, r.new_data, CONTACT_LABELS, look, new Set(["deleted_at"])) : [];
      if (action === "update" && !changes.length) continue;
      entries.push({ ...common, ...blank, category: "contact", title: `Cari ${VERB[action]}`, detail: [s(d.name), ...changes].filter(Boolean).join(" · "), href: `/cariler/detay?id=${r.record_id}` });
    } else if (r.table_name === "products") {
      const changes = action === "update" ? diffText(r.old_data, r.new_data, PRODUCT_LABELS, look, new Set([...PRODUCT_DERIVED, "deleted_at"])) : [];
      if (action === "update" && !changes.length) continue;
      entries.push({ ...common, ...blank, category: "product", title: `Ürün ${VERB[action]}`, detail: [s(d.name), ...changes].filter(Boolean).join(" · "), href: `/urunler/${r.record_id}` });
    } else {
      const changes = action === "update" ? diffText(r.old_data, r.new_data, {}, look, new Set(["deleted_at"])) : [];
      if (action === "update" && !changes.length) continue;
      entries.push({ ...common, ...blank, category: "other", title: `${OTHER_TABLES[r.table_name] ?? r.table_name} ${VERB[action]}`, detail: [s(d.name ?? d.full_name ?? d.serial_number ?? d.number), ...changes].filter(Boolean).join(" · ") });
    }
  }

  // Bir harekete bağlanamayan bakiye değişimleri (doğrudan düzeltme vb.) ayrı satır olur: hiçbir bakiye değişimi gizlenmez
  for (const b of balances.values()) {
    // aynı işlem içinde gidip aynı değere dönen bakiye gerçek bir değişim değildir
    if (b.used || Math.abs(b.after - b.before) < 0.005) continue;
    const d = (b.row.new_data ?? {}) as Json;
    entries.push({
      id: `b${b.row.id}`,
      at: b.row.created_at,
      userId: b.row.user_id,
      action: "update",
      category: "account",
      title: "Hesap bakiyesi değişti",
      detail: s(d.name),
      amount: Math.round((b.after - b.before) * 100) / 100,
      currency: s(d.currency) || "TRY",
      accountId: b.row.record_id,
      balanceBefore: b.before,
      balanceAfter: b.after,
      href: `/nakit/hesaplar/detay?id=${b.row.record_id}`,
    });
  }

  const docEntry = (id: string, at: string, userId: string | null, action: AuditAction, recordId: string | null, docType: string, detail: string, total: number | null, currency: string): AuditEntry => {
    const cfg = DOC_TYPES[docType as DocType];
    return { ...blank, id, at, userId, action, category: "document", title: `${cfg?.label ?? TYPE_LABELS[docType] ?? "Belge"} ${action === "create" ? "oluşturuldu" : VERB[action]}`, detail, amount: total, currency, href: cfg && recordId ? `${cfg.base}/detay?id=${recordId}` : null };
  };

  // Belge kaydı önce boş toplamla eklenip aynı işlemde kalemlerden toplamı günceller: ikisi tek "oluşturuldu" satırında birleştirilir
  const createdDocs = new Map<string, AuditEntry>();
  for (const r of docEvents.rows) {
    const d = (r.new_data ?? r.old_data ?? {}) as Json;
    const currency = s(d.currency) || "TRY";
    const name = s((d.contact_snapshot as Json | null)?.name);
    const entry = docEntry(String(r.id), r.created_at, r.user_id, ACTION[r.action] ?? "update", r.record_id, s(d.doc_type), [s(d.number) || "numarasız", name, d.issue_date ? formatDate(s(d.issue_date)) : null].filter(Boolean).join(" · "), Number(d.total ?? 0), currency);
    if (r.action === "INSERT") createdDocs.set(`${r.created_at}|${r.record_id}`, entry);
    entries.push(entry);
  }

  const realDocUpdates: { r: DocUpdateRow; o: Json; n: Json }[] = [];
  for (const r of docUpdates.rows) {
    const o: Json = {};
    const n: Json = {};
    for (const k of Object.keys(DOC_LABELS)) {
      o[k] = r[`o_${k}`];
      n[k] = r[`n_${k}`];
    }
    // hiçbiri değişmediyse yalnızca ödeme durumu yenilenmiştir: kullanıcı işlemi değil
    if (Object.keys(DOC_LABELS).some((k) => JSON.stringify(o[k] ?? null) !== JSON.stringify(n[k] ?? null))) realDocUpdates.push({ r, o, n });
  }
  const docInfo = new Map<string, { doc_type: string; currency: string; name: string }>();
  const docIds = [...new Set(realDocUpdates.map((x) => s(x.r.record_id)).filter(Boolean))];
  for (let i = 0; i < docIds.length; i += 100) {
    const { data } = await db.from("documents").select("id, doc_type, currency, contact_snapshot").in("id", docIds.slice(i, i + 100));
    for (const d of (data ?? []) as { id: string; doc_type: string; currency: string; contact_snapshot: Json | null }[]) docInfo.set(d.id, { doc_type: d.doc_type, currency: d.currency, name: s(d.contact_snapshot?.name) });
  }
  for (const { r, o, n } of realDocUpdates) {
    const created = createdDocs.get(`${r.created_at}|${s(r.record_id)}`);
    if (created) {
      created.amount = Number(n.total ?? created.amount ?? 0);
      continue;
    }
    const info = docInfo.get(s(r.record_id));
    const currency = info?.currency || "TRY";
    const changes = diffText(o, n, DOC_LABELS, look, new Set(), currency);
    entries.push(docEntry(String(r.id), r.created_at, (r.user_id as string | null) ?? null, "update", (r.record_id as string | null) ?? null, info?.doc_type ?? "", [s(n.number) || "numarasız", info?.name, ...changes].filter(Boolean).join(" · "), Number(n.total ?? 0), currency));
  }

  entries.sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1));
  return { entries, truncated: others.truncated || docEvents.truncated, docUpdatesTruncated };
}

export async function fetchUserNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const { data } = await db.from("profiles").select("id, full_name, email").in("id", ids);
  for (const p of (data ?? []) as { id: string; full_name: string | null; email: string | null }[]) map.set(p.id, p.full_name || p.email || "Kullanıcı");
  return map;
}
