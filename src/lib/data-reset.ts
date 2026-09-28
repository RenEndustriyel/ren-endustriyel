"use client";

import { supabase } from "@/lib/supabase/client";
import { del } from "idb-keyval";
import type { QueryClient } from "@tanstack/react-query";

export type ResetScope = "commercial_stock" | "all_movements" | "factory_reset";

export interface ResetOptions {
  orgId: string;
  scope: ResetScope;
  qc: QueryClient;
  onProgress?: (step: string, current: number, total: number) => void;
}

export interface ScopeInfo {
  key: ResetScope;
  title: string;
  badge: string;
  description: string;
  deletedItems: string[];
  keptItems: string[];
  tone: "warning" | "danger" | "critical";
  confirmButtonText: string;
}

export const RESET_SCOPES: Record<ResetScope, ScopeInfo> = {
  commercial_stock: {
    key: "commercial_stock",
    title: "Ticari & Stok Hareketleri",
    badge: "1. Seçenek · Hareket Temizliği",
    description:
      "Alış, satış, sipariş, irsaliye, teklif ve stok hareketlerini sıfırlar. Stok miktarları 0 yapılır. Ürün kartları, cari kartlar ve kasa/banka hesapları korunur.",
    deletedItems: [
      "Tüm Alış ve Satış Faturaları, Hızlı Satışlar",
      "Teklifler, Siparişler ve İrsaliyeler",
      "Tüm Stok Hareketleri (Giriş, Çıkış, Sayım, Transfer)",
      "Depo Transfer Kayıtları",
      "Fatura ve Belge Satırları",
      "Belge Ödeme Eşleştirmeleri",
      "Ürün stok miktarları 0 (sıfır) yapılır",
      "Ticari belge numara sayaçları sıfırlanır",
    ],
    keptItems: [
      "Müşteri ve Tedarikçi (Cari) Kartları",
      "Ürün ve Hizmet Kartları (Fiyat ve Barkodlar)",
      "Kasa ve Banka Hesapları & Bağımsız Kasa Hareketleri",
      "Masraf ve Maaş Kayıtları",
      "Depolar, Kategoriler ve Birimler",
      "Firma ve Kullanıcı Ayarları",
    ],
    tone: "warning",
    confirmButtonText: "Ticari ve Stok Hareketlerini Sıfırla",
  },
  all_movements: {
    key: "all_movements",
    title: "Tüm Hareketler (Stok, Alış, Satış, Kasa, Banka)",
    badge: "2. Seçenek · Finans & Ticari Temizlik",
    description:
      "Stok, alış, satış, kasa, banka, masraf ve çek hareketlerinin tümünü sıfırlar. Stoklar, cari bakiyeleri ve hesap bakiyeleri sıfırlanır; kartlar ve tanımlar korunur.",
    deletedItems: [
      "1. seçenekteki tüm ticari belgeler ve stok hareketleri",
      "Kasa ve Banka Hareketleri (Tahsilat, Ödeme, Masraf, Virman vb.)",
      "Çek ve Senet Kayıtları ve Çek Olayları",
      "Banka Ekstre Aktarımları ve Satırları",
      "Masraf ve Harcama Fişleri",
      "Tüm Ödeme ve Belge Eşleştirmeleri",
      "Hatırlatıcılar ve Notlar",
      "Tüm Kasa ve Banka Bakiyeleri 0,00 ₺ yapılır",
      "Tüm Ürün Stokları 0 yapılır (Cari bakiyeleri otomatik sıfırlanır)",
      "Tüm Belge Numara Sayaçları sıfırlanır",
    ],
    keptItems: [
      "Müşteri ve Tedarikçi (Cari) Kartları (Tanımlar korunur, bakiyeler 0 olur)",
      "Ürün ve Hizmet Kartları (Fiyat ve Barkodlar korunur, stoklar 0 olur)",
      "Kasa ve Banka Hesap Tanımları (Hesaplar korunur, bakiyeler 0 olur)",
      "Depo Tanımları, Kategoriler, Fiyat Listeleri",
      "Birimler, Firma ve Kullanıcı Hesapları",
    ],
    tone: "danger",
    confirmButtonText: "Tüm Hareketleri Sıfırla",
  },
  factory_reset: {
    key: "factory_reset",
    title: "Tüm Verileri Sıfırla (Fabrika Ayarları)",
    badge: "3. Seçenek · Tam Temizlik",
    description:
      "Müşteriler, tedarikçiler, ürünler, depolar, kasalar, bankalar, kategoriler ve tüm hareketler silinir. Firma ilk kurulduğu günkü temiz fabrika ayarlarına döner.",
    deletedItems: [
      "Tüm Hareketler (Alış, Satış, Stok, Kasa, Banka, Çek, Masraf)",
      "Tüm Müşteri ve Tedarikçi Kartları",
      "Tüm Ürün ve Hizmet Kartları, Alternatif Birimler ve Fiyatlar",
      "Kullanıcı Tanımlı Depolar (Varsayılan 'Merkez Depo' bırakılır)",
      "Kullanıcı Tanımlı Kasa ve Bankalar (Varsayılan 'Merkez Kasa' bırakılır)",
      "Özel Kategoriler (Standart başlangıç kategorileri yüklenir)",
      "Çalışan Kartları, Ekler ve Denetim Kayıtları",
      "Tüm Numara Sayaçları sıfırlanır",
    ],
    keptItems: [
      "Firma Kuruluş Bilgileri ve Ayarları",
      "Kullanıcı Hesapları ve Yetkileri",
      "Standart Sistem Birimleri (Adet, Kg, Litre, Paket vb.)",
      "Standart Başlangıç Kategorileri",
      "Varsayılan 1 Adet Merkez Depo ve Merkez Kasa",
    ],
    tone: "critical",
    confirmButtonText: "Fabrika Ayarlarına Sıfırla",
  },
};

/**
 * 6 karakterli rastgele onay kodu üretir (örn: SF-4921)
 */
export function generateSecurityCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SF-${randomPart}`;
}

export async function resetOrganizationData({ orgId, scope, qc, onProgress }: ResetOptions): Promise<void> {
  if (!orgId) throw new Error("Firma bilgisi bulunamadı.");

  const report = (msg: string, cur: number, total: number) => {
    if (onProgress) onProgress(msg, cur, total);
  };

  // Sunucu tarafında RPC fonksiyonu mevcutsa önce atomik işlemi dene
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcRes = await (supabase.rpc as any)("reset_organization_data", {
      p_org: orgId,
      p_mode: scope,
    });
    if (!rpcRes.error && rpcRes.data?.success) {
      report("Veritabanı sıfırlandı, önbellek temizleniyor...", 1, 1);
      try {
        await del("ren-query-cache");
      } catch (err) {
        console.warn("IndexedDB temizlenemedi:", err);
      }
      qc.clear();
      await qc.invalidateQueries();
      return;
    }
  } catch {
    // RPC yüklü değilse doğrudan istemci üzerinden adımları yürüt
  }

  if (scope === "commercial_stock") {
    const total = 7;
    report("Ticari belgeler taranıyor...", 1, total);

    // Ticari belge ID'lerini bul
    const commDocs = await supabase
      .from("documents")
      .select("id")
      .eq("org_id", orgId)
      .in("doc_type", [
        "quote",
        "sales_order",
        "sales_delivery",
        "sales_invoice",
        "sales_return",
        "pos_sale",
        "purchase_order",
        "purchase_delivery",
        "purchase_invoice",
        "purchase_return",
      ]);
    const docIds = (commDocs.data ?? []).map((d) => d.id);

    report("Ödeme eşleştirmeleri temizleniyor...", 2, total);
    if (docIds.length > 0) {
      await supabase.from("payment_allocations").delete().in("document_id", docIds);
    }

    report("Stok hareketleri ve transferleri siliniyor...", 3, total);
    await supabase.from("stock_movements").delete().eq("org_id", orgId);
    await supabase.from("stock_transfers").delete().eq("org_id", orgId);

    report("Belge satırları siliniyor...", 4, total);
    if (docIds.length > 0) {
      await supabase.from("document_lines").delete().in("document_id", docIds);
    }

    report("Alış ve satış belgeleri siliniyor...", 5, total);
    if (docIds.length > 0) {
      // Kendine referans veren source_document_id bağlarını kaldır
      await supabase.from("documents").update({ source_document_id: null }).in("id", docIds);
      await supabase.from("documents").delete().in("id", docIds);
    }

    report("Ürün stok miktarları sıfırlanıyor...", 6, total);
    await supabase.from("product_stocks").update({ quantity: 0 }).eq("org_id", orgId);
    await supabase.from("products").update({ stock_qty: 0, avg_cost: 0 }).eq("org_id", orgId);

    report("Numara sayaçları sıfırlanıyor...", 7, total);
    await supabase
      .from("number_series")
      .update({ next_number: 1 })
      .eq("org_id", orgId)
      .in("doc_type", [
        "quote",
        "sales_order",
        "sales_delivery",
        "sales_invoice",
        "sales_return",
        "pos_sale",
        "purchase_order",
        "purchase_delivery",
        "purchase_invoice",
        "purchase_return",
        "stock_transfer",
      ]);
  } else if (scope === "all_movements") {
    const total = 10;

    report("Ödeme eşleştirmeleri siliniyor...", 1, total);
    await supabase.from("payment_allocations").delete().eq("org_id", orgId);

    report("Stok hareketleri ve transferleri siliniyor...", 2, total);
    await supabase.from("stock_movements").delete().eq("org_id", orgId);
    await supabase.from("stock_transfers").delete().eq("org_id", orgId);

    report("Fatura ve belge satırları siliniyor...", 3, total);
    await supabase.from("document_lines").delete().eq("org_id", orgId);

    report("Tüm faturalar ve belgeler siliniyor...", 4, total);
    await supabase.from("documents").update({ source_document_id: null }).eq("org_id", orgId);
    await supabase.from("documents").delete().eq("org_id", orgId);

    report("Çek ve senet kayıtları siliniyor...", 5, total);
    await supabase.from("cheque_events").delete().eq("org_id", orgId);
    await supabase.from("cheques").delete().eq("org_id", orgId);

    report("Banka ekstre aktarımları siliniyor...", 6, total);
    await supabase.from("bank_statement_lines").delete().eq("org_id", orgId);
    await supabase.from("bank_statement_imports").delete().eq("org_id", orgId);

    report("Kasa ve banka para hareketleri siliniyor...", 7, total);
    await supabase.from("transactions").delete().eq("org_id", orgId);

    report("Hatırlatıcılar temizleniyor...", 8, total);
    await supabase.from("reminders").delete().eq("org_id", orgId);

    report("Kasa ve banka hesap bakiyeleri sıfırlanıyor...", 9, total);
    await supabase.from("accounts").update({ balance: 0 }).eq("org_id", orgId);

    report("Stoklar ve sayaçlar sıfırlanıyor...", 10, total);
    await supabase.from("product_stocks").update({ quantity: 0 }).eq("org_id", orgId);
    await supabase.from("products").update({ stock_qty: 0, avg_cost: 0 }).eq("org_id", orgId);
    await supabase.from("number_series").update({ next_number: 1 }).eq("org_id", orgId);
  } else if (scope === "factory_reset") {
    const total = 14;

    report("Tüm hareketler ve eşleştirmeler siliniyor...", 1, total);
    await supabase.from("payment_allocations").delete().eq("org_id", orgId);
    await supabase.from("stock_movements").delete().eq("org_id", orgId);
    await supabase.from("stock_transfers").delete().eq("org_id", orgId);
    await supabase.from("document_lines").delete().eq("org_id", orgId);
    await supabase.from("documents").update({ source_document_id: null }).eq("org_id", orgId);
    await supabase.from("documents").delete().eq("org_id", orgId);

    report("Kasa, banka, çek ve ekstre hareketleri siliniyor...", 2, total);
    await supabase.from("cheque_events").delete().eq("org_id", orgId);
    await supabase.from("cheques").delete().eq("org_id", orgId);
    await supabase.from("bank_statement_lines").delete().eq("org_id", orgId);
    await supabase.from("bank_statement_imports").delete().eq("org_id", orgId);
    await supabase.from("transactions").delete().eq("org_id", orgId);
    await supabase.from("reminders").delete().eq("org_id", orgId);

    report("Ürün stok ve fiyat bağları siliniyor...", 3, total);
    await supabase.from("product_units").delete().eq("org_id", orgId);
    await supabase.from("price_list_items").delete().eq("org_id", orgId);
    await supabase.from("product_stocks").delete().eq("org_id", orgId);

    report("Ürün ve hizmet kartları siliniyor...", 4, total);
    await supabase.from("products").delete().eq("org_id", orgId);

    report("Müşteri ve tedarikçi (cari) kartları siliniyor...", 5, total);
    await supabase.from("contacts").delete().eq("org_id", orgId);

    report("Çalışanlar siliniyor...", 6, total);
    await supabase.from("employees").delete().eq("org_id", orgId);

    report("Ekler ve denetim kayıtları siliniyor...", 7, total);
    await supabase.from("attachments").delete().eq("org_id", orgId);
    await supabase.from("audit_log").delete().eq("org_id", orgId);

    report("Depolar sıfırlanıyor (Merkez Depo korunuyor)...", 8, total);
    const { data: whs } = await supabase.from("warehouses").select("id, is_default").eq("org_id", orgId);
    const defaultWh = whs?.find((w) => w.is_default) || whs?.[0];
    if (defaultWh) {
      await supabase.from("warehouses").delete().eq("org_id", orgId).neq("id", defaultWh.id);
      await supabase.from("warehouses").update({ name: "Merkez Depo", is_default: true }).eq("id", defaultWh.id);
    } else {
      await supabase.from("warehouses").insert({ org_id: orgId, name: "Merkez Depo", is_default: true });
    }

    report("Kasa ve bankalar sıfırlanıyor (Merkez Kasa korunuyor)...", 9, total);
    const { data: accs } = await supabase.from("accounts").select("id, type").eq("org_id", orgId);
    const defaultAcc = accs?.find((a) => a.type === "cash") || accs?.[0];
    if (defaultAcc) {
      await supabase.from("accounts").delete().eq("org_id", orgId).neq("id", defaultAcc.id);
      await supabase
        .from("accounts")
        .update({
          name: "Merkez Kasa",
          type: "cash",
          currency: "TRY",
          balance: 0,
          is_active: true,
          sort_order: 1,
        })
        .eq("id", defaultAcc.id);
    } else {
      await supabase.from("accounts").insert({
        org_id: orgId,
        name: "Merkez Kasa",
        type: "cash",
        currency: "TRY",
        balance: 0,
        sort_order: 1,
      });
    }

    report("Fiyat listeleri sıfırlanıyor...", 10, total);
    await supabase.from("price_lists").delete().eq("org_id", orgId);
    await supabase.from("price_lists").insert([
      { org_id: orgId, name: "Perakende", is_default: true },
      { org_id: orgId, name: "Bayi", is_default: false },
    ]);

    report("Standart kategoriler yeniden oluşturuluyor...", 11, total);
    await supabase.from("categories").delete().eq("org_id", orgId);
    const defaultCats = [
      { type: "expense", name: "Kira", color: "#ef7565", sort_order: 1 },
      { type: "expense", name: "Elektrik", color: "#f5a623", sort_order: 2 },
      { type: "expense", name: "Su", color: "#1fa3d1", sort_order: 3 },
      { type: "expense", name: "Doğalgaz", color: "#8b6a55", sort_order: 4 },
      { type: "expense", name: "İnternet / Telefon", color: "#6c5ce7", sort_order: 5 },
      { type: "expense", name: "Akaryakıt", color: "#e17055", sort_order: 6 },
      { type: "expense", name: "Yemek", color: "#00b894", sort_order: 7 },
      { type: "expense", name: "Kargo / Nakliye", color: "#0984e3", sort_order: 8 },
      { type: "expense", name: "Kırtasiye / Ofis", color: "#636e72", sort_order: 9 },
      { type: "expense", name: "Vergi / SGK", color: "#d63031", sort_order: 10 },
      { type: "expense", name: "Maaş", color: "#2d3436", sort_order: 11 },
      { type: "expense", name: "Bakım / Onarım", color: "#fdcb6e", sort_order: 12 },
      { type: "expense", name: "Banka Masrafları", color: "#74b9ff", sort_order: 13 },
      { type: "expense", name: "Diğer", color: "#b2bec3", sort_order: 99 },
      { type: "product", name: "Genel", color: "#636e72", sort_order: 1 },
      { type: "income", name: "Diğer Gelirler", color: "#00b894", sort_order: 1 },
    ];
    await supabase.from("categories").insert(defaultCats.map((c) => ({ ...c, org_id: orgId })));

    report("Numara sayaçları sıfırlanıyor...", 12, total);
    await supabase.from("number_series").update({ next_number: 1 }).eq("org_id", orgId);

    report("Fabrika ayarları tamamlanıyor...", 13, total);
  }

  // Önbellekleri temizle
  try {
    await del("ren-query-cache");
  } catch (err) {
    console.warn("IndexedDB cache temizlenemedi:", err);
  }

  qc.clear();
  await qc.invalidateQueries();
}
