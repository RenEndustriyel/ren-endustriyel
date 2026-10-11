"use client";

import * as React from "react";
import Link from "next/link";
import { Globe, ExternalLink, Share2, Check, QrCode, Copy, MessageCircle, Package, ArrowUpRight } from "lucide-react";
import { useCategories, useProducts, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AppCatalogAdminPage() {
  const products = useProducts();
  const cats = useCategories("product");
  const [copied, setCopied] = React.useState(false);

  const activeProducts = React.useMemo(() => {
    return (products.data ?? []).filter((p) => p.is_active);
  }, [products.data]);

  const catalogUrl = typeof window !== "undefined" ? `${window.location.origin}/katalog` : "/katalog";

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      toast.success("Katalog linki kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Merhaba, güncel ürün ve fiyat listemizi içeren dijital kataloğumuzu aşağıdaki bağlantıdan inceleyebilirsiniz:\n\n${catalogUrl}\n\nİyi çalışmalar dileriz.\n*Ren Endüstriyel*`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Online Katalog"
        description="Müşterilerinizle doğrudan paylaşabileceğiniz, güncel stok ve fiyatlarınızı gösteren web kataloğunuz."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span>{copied ? "Kopyalandı" : "Linki Kopyala"}</span>
            </Button>
            <Button size="sm" onClick={() => window.open("/katalog", "_blank")}>
              <ExternalLink className="size-4" />
              <span>Kataloğu Görüntüle</span>
            </Button>
          </div>
        }
      />

      {/* ÖZET KARTLARI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40">
          <div className="text-xs font-medium text-muted">Katalogdaki Aktif Ürün</div>
          <div className="mt-1 text-2xl font-bold text-text tabular-nums">{activeProducts.length} adet</div>
          <p className="mt-1 text-xs text-muted">Stok ve fiyat güncellemeleri anında yansır.</p>
        </Card>

        <Card className="p-4 border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40">
          <div className="text-xs font-medium text-muted">Kategoriler</div>
          <div className="mt-1 text-2xl font-bold text-text tabular-nums">{cats.data?.length || 0} kategori</div>
          <p className="mt-1 text-xs text-muted">Müşterileriniz kategoriye göre filtreleyebilir.</p>
        </Card>

        <Card className="p-4 border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40">
          <div className="text-xs font-medium text-muted">Sipariş Yöntemi</div>
          <div className="mt-1 text-base font-bold text-text flex items-center gap-1.5">
            <MessageCircle className="size-4" /> WhatsApp 1-Tıkla Sipariş
          </div>
          <p className="mt-1 text-xs text-muted">Müşteri ürüne tıkladığında doğrudan WhatsApp mesajı oluşur.</p>
        </Card>
      </div>

      {/* PAYLAŞIM VE BAĞLANTI PANELİ */}
      <Card className="p-5 border-slate-300 dark:border-slate-800">
        <h3 className="font-bold text-base text-text mb-2">Katalog Paylaşım Bağlantısı</h3>
        <p className="text-xs text-muted mb-4">
          Bu bağlantıyı müşterilerinize WhatsApp, SMS veya e-posta ile iletebilir, sosyal medya hesaplarınıza ekleyebilirsiniz.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={catalogUrl}
            className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-mono text-muted select-all focus:outline-none"
          />
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span>Kopyala</span>
          </Button>
          <Button
            size="sm"
            onClick={handleWhatsAppShare}
            className="shrink-0 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          >
            <MessageCircle className="size-3.5" />
            <span>WhatsApp ile Paylaş</span>
          </Button>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-surface-2/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface border border-border text-muted">
              <Globe className="size-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Canlı Müşteri Görünümü</div>
              <div className="text-xs text-muted">Kataloğunuz mobil, tablet ve masaüstü uyumludur.</div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/katalog" target="_blank">
              <span>Sekmede Aç</span>
              <ArrowUpRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
