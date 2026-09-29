"use client";

import { formatMoney } from "./format";
import type { Row } from "./data";

export type DiscrepancyType =
  | "discount_missing"   // Önceki faturada iskonto vardı, bu faturada hiç uygulanmadı
  | "discount_reduced"   // Önceki faturada daha yüksek iskonto vardı, şimdi düşürüldü
  | "price_increased"    // Birim liste fiyatı artırıldı
  | "price_and_discount"; // Hem fiyat artırıldı hem iskonto düşürüldü

export type RenAiDiscrepancy = {
  id: string;
  docId: string;
  docNumber: string;
  docDate: string;
  contactId: string;
  contactName: string;
  productId: string;
  productName: string;
  productCode?: string | null;
  quantity: number;
  currentUnitPrice: number;
  previousUnitPrice: number;
  currentDiscount: number;
  previousDiscount: number;
  currentNet: number;
  previousNet: number;
  unitLoss: number;
  totalLoss: number;
  vatRate: number;
  currency: string;
  type: DiscrepancyType;
  previousDocNumber: string;
  previousDocDate: string;
  explanation: string;
  whatsappDraft: string;
  suggestedInvoiceDesc: string;
  createdAt: string;
  status: "pending" | "invoiced" | "disputed" | "accepted" | "ignored";
};

export type RenAiStats = {
  totalLossDetected: number;
  totalLossInvoiced: number;
  totalLossDisputed: number;
  pendingCount: number;
  invoicedCount: number;
  supplierCount: number;
};

const STORAGE_KEY = "ren_ai_discrepancy_alerts";

/** Yerel depolamadaki tüm REN AI uyarılarını getirir */
export function getStoredAiAlerts(orgId?: string): RenAiDiscrepancy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${orgId || "default"}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("REN AI alert okuma hatası:", e);
    return [];
  }
}

/** Yeni uyarıları yerel depoya ekler veya günceller */
export function saveAiAlerts(alerts: RenAiDiscrepancy[], orgId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredAiAlerts(orgId);
    const existingIds = new Set(existing.map((a) => a.id));
    const merged = [...existing];
    for (const a of alerts) {
      if (!existingIds.has(a.id)) {
        merged.unshift(a);
      }
    }
    localStorage.setItem(`${STORAGE_KEY}_${orgId || "default"}`, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("ren_ai_alerts_updated"));
  } catch (e) {
    console.error("REN AI alert kaydetme hatası:", e);
  }
}

/** Belirli bir uyarının durumunu günceller (örn: faturası kesildi) */
export function updateAiAlertStatus(
  alertId: string,
  status: RenAiDiscrepancy["status"],
  orgId?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const alerts = getStoredAiAlerts(orgId);
    const updated = alerts.map((a) => (a.id === alertId ? { ...a, status } : a));
    localStorage.setItem(`${STORAGE_KEY}_${orgId || "default"}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("ren_ai_alerts_updated"));
  } catch (e) {
    console.error("REN AI alert durum güncelleme hatası:", e);
  }
}

/** İstatistikleri hesaplar */
export function getAiStats(alerts: RenAiDiscrepancy[]): RenAiStats {
  const suppliers = new Set(alerts.map((a) => a.contactId));
  let totalLossDetected = 0;
  let totalLossInvoiced = 0;
  let totalLossDisputed = 0;
  let pendingCount = 0;
  let invoicedCount = 0;

  for (const a of alerts) {
    totalLossDetected += a.totalLoss;
    if (a.status === "invoiced") {
      totalLossInvoiced += a.totalLoss;
      invoicedCount++;
    } else if (a.status === "disputed") {
      totalLossDisputed += a.totalLoss;
    } else if (a.status === "pending") {
      pendingCount++;
    }
  }

  return {
    totalLossDetected: Math.round(totalLossDetected * 100) / 100,
    totalLossInvoiced: Math.round(totalLossInvoiced * 100) / 100,
    totalLossDisputed: Math.round(totalLossDisputed * 100) / 100,
    pendingCount,
    invoicedCount,
    supplierCount: suppliers.size,
  };
}

export type LineForAnalysis = {
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  vat_rate: number;
};

export type PastPurchaseLine = {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  vat_rate: number;
  net_amount?: number;
  document: {
    id: string;
    number: string | null;
    issue_date: string;
    contact_id: string | null;
    currency: string;
  };
};

/**
 * Alış faturasındaki satırları aynı tedarikçiden yapılan geçmiş alımlarla karşılaştırır.
 * İskonto kayıplarını, birim fiyat artışlarını ve net finansal zararı hesaplar.
 */
export function analyzePurchaseDiscrepancies({
  currentDoc,
  currentLines,
  pastLines,
  contactName,
  currency = "TRY",
}: {
  currentDoc: { id: string; number?: string; issue_date: string; contact_id: string };
  currentLines: LineForAnalysis[];
  pastLines: PastPurchaseLine[];
  contactName: string;
  currency?: string;
}): RenAiDiscrepancy[] {
  const discrepancies: RenAiDiscrepancy[] = [];

  for (const line of currentLines) {
    if (!line.product_id && !line.description?.trim()) continue;
    if (line.quantity <= 0 || line.unit_price <= 0) continue;

    // Aynı tedarikçiden bu ürün için geçmiş satırları bul
    const matches = pastLines.filter((pl) => {
      if (pl.document.id === currentDoc.id) return false;
      if (pl.document.contact_id !== currentDoc.contact_id) return false;
      if (line.product_id && pl.product_id) {
        return pl.product_id === line.product_id;
      }
      return (
        line.description &&
        pl.description &&
        pl.description.trim().toLowerCase() === line.description.trim().toLowerCase()
      );
    });

    if (!matches.length) continue;

    // En son tarihli önceki alımı al
    matches.sort((a, b) => (b.document.issue_date > a.document.issue_date ? 1 : -1));
    const prev = matches[0];

    const curUnitPrice = Number(line.unit_price);
    const curDisc = Number(line.discount_rate || 0);
    const curNet = curUnitPrice * (1 - curDisc / 100);

    const prevUnitPrice = Number(prev.unit_price);
    const prevDisc = Number(prev.discount_rate || 0);
    const prevNet = prevUnitPrice * (1 - prevDisc / 100);

    // Net fiyat artmış mı veya iskonto düşmüş mü?
    const netDiff = curNet - prevNet;
    const isDiscDrop = prevDisc > curDisc;
    const isPriceHike = curUnitPrice > prevUnitPrice + 0.001;

    // Zarar veya iskonto kaybı varsa
    if (netDiff > 0.01 || isDiscDrop) {
      let type: DiscrepancyType = "price_increased";
      if (isDiscDrop && curDisc === 0) {
        type = isPriceHike ? "price_and_discount" : "discount_missing";
      } else if (isDiscDrop) {
        type = isPriceHike ? "price_and_discount" : "discount_reduced";
      }

      const unitLoss = Math.max(0, netDiff);
      const totalLoss = Math.round((unitLoss * Number(line.quantity) + Number.EPSILON) * 100) / 100;
      const prevDocNo = prev.document.number || "Önceki Belge";
      const curDocNo = currentDoc.number || "Yeni Alış";
      const pName = line.description || "Ürün";

      let explanation = "";
      if (type === "discount_missing") {
        explanation = `Bu ürünü aynı tedarikçiden ${prev.document.issue_date} tarihinde (${prevDocNo}) %${prevDisc} iskonto ile net ${formatMoney(prevNet, currency)} birim fiyata almıştınız. Bu faturada ise hiç iskonto uygulanmamış (net ${formatMoney(curNet, currency)}). ${line.quantity} adet alımda toplam ${formatMoney(totalLoss, currency)} fazladan ödeme / zarar oluştu.`;
      } else if (type === "discount_reduced") {
        explanation = `Önceki faturada (${prevDocNo}) %${prevDisc} iskonto uygulanmışken, bu faturada iskonto %${curDisc} oranına düşürülmüştür. İskonto kaybından kaynaklanan toplam fark: ${formatMoney(totalLoss, currency)}.`;
      } else if (type === "price_and_discount") {
        explanation = `Tedarikçi hem birim fiyatı ${formatMoney(prevUnitPrice, currency)}'den ${formatMoney(curUnitPrice, currency)}'ye yükseltti hem de önceki %${prevDisc} olan iskontoyu düşürdü. Toplam maliyet artışı: ${formatMoney(totalLoss, currency)}.`;
      } else {
        explanation = `Önceki faturada (${prevDocNo}) net birim fiyat ${formatMoney(prevNet, currency)} iken, bu faturada ${formatMoney(curNet, currency)} olarak kaydedildi. Fiyat artışından kaynaklanan toplam fark: ${formatMoney(totalLoss, currency)}.`;
      }

      const whatsappDraft = `Sayın ${contactName} Yetkilisi,

${currentDoc.issue_date} tarihli ${curDocNo} numaralı faturanız incelendiğinde;
"${pName}" kaleminde önceki faturamızda (${prevDocNo}) uygulanan ${prevDisc > 0 ? `%${prevDisc} iskonto` : `anlaşılan ${formatMoney(prevNet, currency)} net fiyat`} şartlarının bu faturada yansıtılmadığı (${curDisc > 0 ? `%${curDisc} iskonto` : "iskontosuz"}) tespit edilmiştir.

Oluşan toplam ${formatMoney(totalLoss, currency)} (+KDV) tutarındaki fark için tarafınıza Fiyat Farkı Faturası düzenlenecektir.

Bilginize sunar, iyi çalışmalar dileriz.
Ren Endüstriyel`;

      const suggestedInvoiceDesc = `${pName} Fiyat / İskonto Farkı Yansıtma (${curDocNo} No'lu Alış Faturası)`;

      discrepancies.push({
        id: `ren-ai-${currentDoc.id}-${line.product_id || line.description}-${Date.now()}`,
        docId: currentDoc.id,
        docNumber: curDocNo,
        docDate: currentDoc.issue_date,
        contactId: currentDoc.contact_id,
        contactName,
        productId: line.product_id || "",
        productName: pName,
        quantity: Number(line.quantity),
        currentUnitPrice: curUnitPrice,
        previousUnitPrice: prevUnitPrice,
        currentDiscount: curDisc,
        previousDiscount: prevDisc,
        currentNet: curNet,
        previousNet: prevNet,
        unitLoss,
        totalLoss,
        vatRate: line.vat_rate,
        currency,
        type,
        previousDocNumber: prevDocNo,
        previousDocDate: prev.document.issue_date,
        explanation,
        whatsappDraft,
        suggestedInvoiceDesc,
        createdAt: new Date().toISOString(),
        status: "pending",
      });
    }
  }

  return discrepancies;
}
