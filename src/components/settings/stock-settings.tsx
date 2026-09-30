"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Boxes, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useOrg } from "@/providers/org-provider";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export function StockWarningSettings() {
  const { org, isAdmin, canWrite, refresh } = useOrg();
  const canManage = isAdmin || canWrite;

  const orgSettings = (org?.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, any>;

  // Varsayılan: warn_negative_stock explicitly false olmadığı sürece açıktır
  const [warnNegative, setWarnNegative] = React.useState<boolean>(
    orgSettings.warn_negative_stock !== false
  );
  // Varsayılan: block_negative_stock false
  const [blockNegative, setBlockNegative] = React.useState<boolean>(
    orgSettings.block_negative_stock === true
  );

  const [saving, setSaving] = React.useState(false);

  // Kurum ayarları güncellendiğinde senkronize et
  React.useEffect(() => {
    const s = (org?.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, any>;
    setWarnNegative(s.warn_negative_stock !== false);
    setBlockNegative(s.block_negative_stock === true);
  }, [org?.settings]);

  const saveSettings = async (newWarn: boolean, newBlock: boolean) => {
    if (!org) return;
    setSaving(true);
    try {
      const current = (org.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, any>;
      const updated = {
        ...current,
        warn_negative_stock: newWarn,
        block_negative_stock: newBlock,
      };

      const { error } = await supabase
        .from("organizations")
        .update({
          settings: updated,
          updated_at: new Date().toISOString(),
        })
        .eq("id", org.id);

      if (error) throw error;

      await refresh();
      toast.success("Stok kontrol ayarları güncellendi");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleWarnToggle = async (val: boolean) => {
    setWarnNegative(val);
    const newBlock = !val ? false : blockNegative;
    if (!val) setBlockNegative(false);
    await saveSettings(val, newBlock);
  };

  const handleBlockToggle = async (val: boolean) => {
    setBlockNegative(val);
    const newWarn = val ? true : warnNegative;
    if (val) setWarnNegative(true);
    await saveSettings(newWarn, val);
  };

  return (
    <Card className="col-span-full">
      <CardHeader
        icon={<Boxes className="size-5 text-primary" />}
        title="Stok Uyarı ve Eksi Bakiye Kontrolleri"
        action={
          <Badge tone={warnNegative ? "warning" : "neutral"} className="flex items-center gap-1">
            {warnNegative ? (
              <>
                <AlertTriangle className="size-3" />
                Eksi Stok Uyarısı: Açık
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3" />
                Eksi Stok Uyarısı: Kapalı
              </>
            )}
          </Badge>
        }
      />
      <CardBody className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          Satış Faturaları, Satış Siparişleri, İrsaliyeler ve Hızlı Satış (POS) ekranlarında eldeki mevcut stok seviyesinin altına düşüldüğünde sistemin nasıl davranacağını buradan yönetebilirsiniz.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 1. Eksi Stok Uyarısı */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-2/40 p-4 transition-all hover:border-border/80">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text">Eksi Stok Uyarısı Ver</span>
                  <Badge tone={warnNegative ? "success" : "neutral"}>
                    {warnNegative ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Satış veya sipariş girilirken ürün miktarı depodaki mevcut stoktan fazlaysa satır altında kırmızı uyarı rozeti çıkar ve kaydederken onay penceresi açılır.
                </p>
              </div>
              <Switch
                checked={warnNegative}
                disabled={!canManage || saving}
                onCheckedChange={handleWarnToggle}
                aria-label="Eksi stok uyarısı ver veya verme"
              />
            </div>
            <div className="rounded-lg bg-surface px-3 py-2 text-[11px] text-muted border border-border/50">
              <span className="font-semibold text-text">Durum:</span>{" "}
              {warnNegative
                ? "Yetersiz stok durumunda kullanıcıya görsel uyarı verilir ve onay istenir."
                : "Eksi stok uyarısı kapalıdır. Yetersiz stok olsa dahi uyarı verilmeden doğrudan kaydedilir."}
            </div>
          </div>

          {/* 2. Eksiye Düşmeyi Engelle */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-2/40 p-4 transition-all hover:border-border/80">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text">Eksi Stoğa Düşmeyi Tamamen Engelle</span>
                  <Badge tone={blockNegative ? "danger" : "neutral"}>
                    {blockNegative ? "Engelliyor" : "Serbest"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Depodaki mevcut stok miktarından daha fazla ürün çıkışı yapılmasına kesinlikle izin vermez. Satışı veya faturayı kaydetmeyi durdurur.
                </p>
              </div>
              <Switch
                checked={blockNegative}
                disabled={!canManage || saving}
                onCheckedChange={handleBlockToggle}
                aria-label="Eksi stoğa düşmeyi engelle"
              />
            </div>
            <div className="rounded-lg bg-surface px-3 py-2 text-[11px] text-muted border border-border/50">
              <span className="font-semibold text-text">Güvenlik:</span>{" "}
              {blockNegative
                ? "Stoksuz ürün satışı kesin olarak engellenir (Sıfırın altına düşüş bloke edilir)."
                : "Eksi bakiye ile satış yapılabilir."}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-info-soft/40 p-3 text-xs text-info border border-info/20">
          <Info className="size-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>İpucu:</strong> Eğer firmanız sipariş üzerine çalışıyor ve fiziksel ürün depoya girmeden önce fatura/sipariş kesiyorsanız, eksi stok uyarısını açık bırakıp engellemeyi kapalı tutabilir veya uyarıyı tamamen kapatabilirsiniz.
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
