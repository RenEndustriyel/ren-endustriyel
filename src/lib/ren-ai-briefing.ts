"use client";

import { formatMoney, isoDate } from "./format";
import { supabase } from "./supabase/client";

export type DueItem = {
  id: string;
  type: "collection" | "payment";
  contactId?: string | null;
  contactName: string;
  docNumber: string;
  amount: number;
  dueDate: string;
  isOverdue: boolean;
  daysDiff: number;
};

export type TopSellingProduct = {
  id: string;
  name: string;
  code?: string | null;
  soldQty: number;
  totalRevenue: number;
  stockQty: number;
  dailyBurnRate: number;
  daysOfStockLeft: number;
};

export type SlowMovingProduct = {
  id: string;
  name: string;
  code?: string | null;
  stockQty: number;
  purchasePrice: number;
  salePrice: number;
  idleCapital: number;
  lastSaleDate: string | null;
  daysSinceLastSale: number;
  aiCampaignTitle: string;
  aiCampaignIdea: string;
  suggestedDiscountRate: number;
};

export type CustomerInsight = {
  id: string;
  name: string;
  balance: number;
  overdueAmount: number;
  riskLevel: "low" | "medium" | "high";
  note: string;
};

export type RenAiDailyBriefing = {
  date: string;
  formattedDate: string;
  executiveSummary: string;
  todayCollections: DueItem[];
  todayPayments: DueItem[];
  totalExpectedInflow: number;
  totalExpectedOutflow: number;
  netCashForecast: number;
  topSellers: TopSellingProduct[];
  slowMoving: SlowMovingProduct[];
  totalIdleCapital: number;
  customerInsights: CustomerInsight[];
  discrepanciesCount: number;
};

/**
 * Veritabanından canlı kayıtları çekip bugünkü sabah brifingini hesaplar.
 */
export async function generateDailyBriefing(orgId: string): Promise<RenAiDailyBriefing> {
  const today = isoDate();
  const todayDate = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(todayDate.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const formattedDate = todayDate.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  try {
    // 1. Vadesi gelen ve vadesi geçmiş belgeleri çek
    const { data: docs } = await supabase
      .from("documents")
      .select(`
        id,
        doc_type,
        number,
        issue_date,
        due_date,
        total,
        paid_amount,
        payment_status,
        contact_id,
        contacts (id, name, phone)
      `)
      .eq("org_id", orgId)
      .neq("payment_status", "paid")
      .not("due_date", "is", null);

    const todayCollections: DueItem[] = [];
    const todayPayments: DueItem[] = [];

    if (docs) {
      for (const d of docs) {
        const remaining = Math.max(0, Number(d.total) - Number(d.paid_amount || 0));
        if (remaining <= 0.01) continue;

        const dueDate = d.due_date!;
        const dueObj = new Date(dueDate);
        const diffDays = Math.round((todayDate.getTime() - dueObj.getTime()) / (1000 * 3600 * 24));
        const isOverdue = dueDate < today;
        const isToday = dueDate === today;

        // Bugün vadesi gelen veya vadesi geçmiş tahsilatlar (satış faturası)
        if (d.doc_type === "sales_invoice" || d.doc_type === "pos_sale") {
          if (isToday || isOverdue) {
            todayCollections.push({
              id: d.id,
              type: "collection",
              contactId: d.contact_id,
              contactName: (d.contacts as any)?.name || "Müşteri",
              docNumber: d.number || "Fatura",
              amount: remaining,
              dueDate,
              isOverdue,
              daysDiff: Math.max(0, diffDays),
            });
          }
        }

        // Bugün vadesi gelen veya vadesi geçmiş ödemeler (alış faturası, masraf)
        if (d.doc_type === "purchase_invoice" || d.doc_type === "expense") {
          if (isToday || isOverdue) {
            todayPayments.push({
              id: d.id,
              type: "payment",
              contactId: d.contact_id,
              contactName: (d.contacts as any)?.name || "Tedarikçi",
              docNumber: d.number || "Fatura",
              amount: remaining,
              dueDate,
              isOverdue,
              daysDiff: Math.max(0, diffDays),
            });
          }
        }
      }
    }

    // Sıralama: En yüksek tutarlı ve en çok gecikenler başta
    todayCollections.sort((a, b) => b.amount - a.amount);
    todayPayments.sort((a, b) => b.amount - a.amount);

    const totalExpectedInflow = todayCollections.reduce((s, c) => s + c.amount, 0);
    const totalExpectedOutflow = todayPayments.reduce((s, p) => s + p.amount, 0);
    const netCashForecast = totalExpectedInflow - totalExpectedOutflow;

    // 2. Çok satan ürünleri ve son 30 günün satış trendlerini çek
    const { data: salesLines } = await supabase
      .from("document_lines")
      .select(`
        product_id,
        description,
        quantity,
        total_amount,
        documents!inner (
          id,
          org_id,
          doc_type,
          issue_date
        )
      `)
      .eq("documents.org_id", orgId)
      .in("documents.doc_type", ["sales_invoice", "pos_sale"])
      .gte("documents.issue_date", thirtyDaysStr);

    const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
    const soldProductIds = new Set<string>();

    if (salesLines) {
      for (const sl of salesLines) {
        if (!sl.product_id) continue;
        soldProductIds.add(sl.product_id);
        const cur = productSalesMap.get(sl.product_id) || {
          name: sl.description || "Ürün",
          qty: 0,
          revenue: 0,
        };
        cur.qty += Number(sl.quantity || 0);
        cur.revenue += Number(sl.total_amount || 0);
        productSalesMap.set(sl.product_id, cur);
      }
    }

    // Tüm aktif ürünleri çek
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, name, code, stock_qty, purchase_price, sale_price, track_stock, is_active")
      .eq("org_id", orgId)
      .eq("is_active", true);

    const topSellers: TopSellingProduct[] = [];
    const slowMoving: SlowMovingProduct[] = [];

    if (allProducts) {
      for (const prod of allProducts) {
        const sales = productSalesMap.get(prod.id);
        const stockQty = Number(prod.stock_qty || 0);
        const buyPrice = Number(prod.purchase_price || 0);
        const sellPrice = Number(prod.sale_price || 0);

        if (sales && sales.qty > 0) {
          const dailyBurn = sales.qty / 30;
          const daysLeft = dailyBurn > 0 ? Math.round(stockQty / dailyBurn) : 999;
          topSellers.push({
            id: prod.id,
            name: prod.name,
            code: prod.code,
            soldQty: Math.round(sales.qty * 10) / 10,
            totalRevenue: Math.round(sales.revenue),
            stockQty,
            dailyBurnRate: Math.round(dailyBurn * 10) / 10,
            daysOfStockLeft: daysLeft,
          });
        } else if (prod.track_stock && stockQty > 0) {
          // 30 gündür hiç satılmamış atıl stok!
          const idleCapital = Math.round(stockQty * buyPrice);
          if (idleCapital > 0 || stockQty >= 5) {
            let aiCampaignTitle = "Paket Satış (Bundle) Kampanyası";
            let aiCampaignIdea = `Depoda ${stockQty} adet bağlı duruyor (${formatMoney(idleCapital)}). En çok satan ürünlerin yanında %15 indirimle sunarak eritilebilir.`;
            let suggestedDiscountRate = 15;

            if (stockQty > 20) {
              aiCampaignTitle = "Toplu Alım / Stok Eritme İndirimi";
              aiCampaignIdea = `Yüksek stok adedi sebebiyle 10+ adet alımlarda %20 özel iskonto tanımlayarak nakit akışına çevirebilirsiniz.`;
              suggestedDiscountRate = 20;
            } else if (sellPrice > buyPrice * 1.5) {
              aiCampaignTitle = "Flaş Fiyat Kampanyası";
              aiCampaignIdea = `Yüksek kâr marjınız bulunuyor (%${Math.round(((sellPrice - buyPrice) / buyPrice) * 100)}). %12 indirim uygulayarak müşterilerinize hızlı teklif geçebilirsiniz.`;
              suggestedDiscountRate = 12;
            }

            slowMoving.push({
              id: prod.id,
              name: prod.name,
              code: prod.code,
              stockQty,
              purchasePrice: buyPrice,
              salePrice: sellPrice,
              idleCapital,
              lastSaleDate: null,
              daysSinceLastSale: 30,
              aiCampaignTitle,
              aiCampaignIdea,
              suggestedDiscountRate,
            });
          }
        }
      }
    }

    // Çok satanları ciroya göre sırala
    topSellers.sort((a, b) => b.totalRevenue - a.totalRevenue);
    // Yavaş gidenleri depoda bağlanan sermayeye göre sırala
    slowMoving.sort((a, b) => b.idleCapital - a.idleCapital);

    const totalIdleCapital = slowMoving.reduce((s, sm) => s + sm.idleCapital, 0);

    // 4. Müşteri risk analizi
    const customerInsights: CustomerInsight[] = [];
    if (todayCollections.length > 0) {
      const topDebtors = todayCollections.slice(0, 4);
      for (const d of topDebtors) {
        customerInsights.push({
          id: d.contactId || d.id,
          name: d.contactName,
          balance: d.amount,
          overdueAmount: d.isOverdue ? d.amount : 0,
          riskLevel: d.daysDiff > 30 ? "high" : d.daysDiff > 7 ? "medium" : "low",
          note: d.isOverdue
            ? `${d.daysDiff} gündür geciken ${formatMoney(d.amount)} tutarındaki bakiye için acil tahsilat hatırlatması yapılmalıdır.`
            : `Bugün vadesi dolan ${formatMoney(d.amount)} tutarındaki fatura tahsilatı bekleniyor.`,
        });
      }
    }

    // 5. Yönetici Brifing Özeti Metni Oluştur
    let executiveSummary = `Günaydın! ${formattedDate} tarihi itibarıyla işletmenizin finansal ve operasyonel durumu: `;
    if (totalExpectedInflow > 0) {
      executiveSummary += `Bugün ve gecikmede olan toplam **${formatMoney(totalExpectedInflow)}** tahsilatınız bulunmaktadır. `;
    } else {
      executiveSummary += `Bugün için bekleyen acil tahsilat görünmüyor. `;
    }

    if (totalExpectedOutflow > 0) {
      executiveSummary += `Yapılması gereken tedarikçi/gider ödemeleriniz ise **${formatMoney(totalExpectedOutflow)}**. `;
    }

    if (slowMoving.length > 0) {
      executiveSummary += `Deponuzda son 30 gündür satılmayan ve yaklaşık **${formatMoney(totalIdleCapital)}** sermaye bağlayan ${slowMoving.length} ürün tespit edildi; kârınızı artırmak için yapay zeka kampanya önerilerini inceleyebilirsiniz.`;
    }

    return {
      date: today,
      formattedDate,
      executiveSummary,
      todayCollections: todayCollections.slice(0, 10),
      todayPayments: todayPayments.slice(0, 10),
      totalExpectedInflow,
      totalExpectedOutflow,
      netCashForecast,
      topSellers: topSellers.slice(0, 5),
      slowMoving: slowMoving.slice(0, 8),
      totalIdleCapital,
      customerInsights,
      discrepanciesCount: 0,
    };
  } catch (error) {
    console.error("Sabah brifingi hesaplama hatası:", error);
    return {
      date: today,
      formattedDate,
      executiveSummary: "Günlük sabah brifingi verileri yükleniyor...",
      todayCollections: [],
      todayPayments: [],
      totalExpectedInflow: 0,
      totalExpectedOutflow: 0,
      netCashForecast: 0,
      topSellers: [],
      slowMoving: [],
      totalIdleCapital: 0,
      customerInsights: [],
      discrepanciesCount: 0,
    };
  }
}
