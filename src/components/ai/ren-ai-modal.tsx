"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Receipt,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RenAiDiscrepancy, updateAiAlertStatus } from "@/lib/ren-ai";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discrepancies: RenAiDiscrepancy[];
  onProceedSave: () => void;
  currency?: string;
}

export function RenAiModal({
  open,
  onOpenChange,
  discrepancies,
  onProceedSave,
  currency = "TRY",
}: Props) {
  const router = useRouter();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!discrepancies.length) return null;

  const totalLoss = discrepancies.reduce((sum, d) => sum + d.totalLoss, 0);

  const handleCopyWhatsapp = (item: RenAiDiscrepancy) => {
    navigator.clipboard.writeText(item.whatsappDraft);
    setCopiedId(item.id);
    updateAiAlertStatus(item.id, "disputed");
    toast.success("Tedarikçi itiraz metni kopyalandı! WhatsApp veya E-Posta ile gönderebilirsiniz.");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreatePriceDiffInvoice = (item: RenAiDiscrepancy) => {
    // Fiyat Farkı Faturası kesmek için Satış Faturası ekranına yönlendir
    updateAiAlertStatus(item.id, "invoiced");
    onOpenChange(false);
    onProceedSave();
    
    // Satış faturası oluşturma sayfasına parametrelerle git
    const params = new URLSearchParams({
      fiyat_farki: "1",
      contact_id: item.contactId,
      tutar: String(item.totalLoss),
      kdv: String(item.vatRate),
      aciklama: item.suggestedInvoiceDesc,
      belge_no: item.docNumber,
    });
    
    toast.info("Fiyat Farkı Faturası düzenleme ekranı açılıyor...");
    router.push(`/satislar/faturalar/yeni?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="REN Yapay Zeka · Kâr Koruma Bildirimi"
        description="Tedarikçi geçmiş alım fiyatları ile bu faturadaki fiyatlar arasında zarar oluşturabilecek farklar tespit edildi."
        className="sm:max-w-2xl border-purple-500/30"
      >
        <div className="space-y-4 pt-1">
          {/* AI Banner */}
          <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent p-3.5 text-xs text-text shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
                <Sparkles className="size-5 animate-spin-slow" />
              </div>
              <div className="flex-1 leading-relaxed">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px] text-purple-700 dark:text-purple-300">
                    REN YAPAY ZEKA KÂR KALKANI
                  </span>
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10.5px] font-bold text-red-600 dark:text-red-400">
                    ZARAR TESPİTİ
                  </span>
                </div>
                <p className="mt-1 text-muted text-xs">
                  Aynı tedarikçiden daha önce aldığınız ürünlerdeki iskonto veya fiyat şartları bu faturaya yansıtılmamış. Toplam oluşabilecek kâr kaybınız:{" "}
                  <strong className="text-red-600 dark:text-red-400 font-bold text-sm">
                    {formatMoney(totalLoss, currency)}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* Tespit Edilen Farklar Listesi */}
          <div className="max-h-80 overflow-y-auto space-y-2.5 thin-scroll pr-1">
            {discrepancies.map((item) => {
              const isMissingDisc = item.type === "discount_missing";
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-purple-400/40 hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-text">{item.productName}</span>
                        {isMissingDisc ? (
                          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10.5px] font-bold text-red-600 dark:text-red-400">
                            İskonto Uygulanmamış!
                          </span>
                        ) : item.type === "discount_reduced" ? (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-400">
                            İskonto Düşürülmüş
                          </span>
                        ) : (
                          <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10.5px] font-bold text-orange-600 dark:text-orange-400">
                            Fiyat Artırılmış
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        Tedarikçi: <strong>{item.contactName}</strong> · Miktar:{" "}
                        <strong>{item.quantity} Adet</strong>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10.5px] text-muted">Oluşan Fark / Kayıp</div>
                      <div className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                        +{formatMoney(item.totalLoss, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Detay Karşılaştırması */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg bg-surface-2/60 p-2 text-xs">
                    <div>
                      <div className="text-[10px] text-muted font-medium">Önceki Alım ({item.previousDocNumber})</div>
                      <div className="font-semibold text-text">
                        Net: {formatMoney(item.previousNet, currency)}{" "}
                        {item.previousDiscount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            (%{item.previousDiscount} iskonto)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted font-medium">Bu Alım ({item.docNumber})</div>
                      <div className="font-semibold text-text">
                        Net: {formatMoney(item.currentNet, currency)}{" "}
                        {item.currentDiscount > 0 ? (
                          <span className="text-muted font-medium">(%{item.currentDiscount} iskonto)</span>
                        ) : (
                          <span className="text-red-500 font-bold">(İskontosuz)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Açıklaması */}
                  <div className="mt-2 text-[11.5px] text-text/80 leading-relaxed bg-purple-500/5 rounded-md p-2 border border-purple-500/15">
                    💡 <strong>Yapay Zeka Notu:</strong> {item.explanation}
                  </div>

                  {/* Aksiyon Butonları */}
                  <div className="mt-3 flex items-center justify-end gap-2 pt-1 border-t border-border/60">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyWhatsapp(item)}
                      className="text-xs h-7 gap-1.5"
                      title="Tedarikçiye WhatsApp üzerinden gönderilecek itiraz metnini kopyalar"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="size-3.5 text-emerald-500" />
                          <span>Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="size-3.5 text-emerald-600" />
                          <span>WhatsApp Metnini Kopyala</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCreatePriceDiffInvoice(item)}
                      className="text-xs h-7 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                      title="Bu fark için tedarikçiye Fiyat Farkı Satış Faturası oluşturur"
                    >
                      <Receipt className="size-3.5" />
                      <span>Fiyat Farkı Faturası Kes</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alt Butonlar */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Faturayı Düzenlemeye Dön
            </Button>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  onOpenChange(false);
                  onProceedSave();
                }}
                className="w-full sm:w-auto"
              >
                Faturayı Kaydet ve AI Merkezine Ekle
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
