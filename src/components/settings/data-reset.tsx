"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/providers/org-provider";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  RESET_SCOPES,
  generateSecurityCode,
  resetOrganizationData,
  type ResetScope,
} from "@/lib/data-reset";

export function DataResetSettings() {
  const { org, isAdmin } = useOrg();
  const qc = useQueryClient();

  const [activeScope, setActiveScope] = React.useState<ResetScope | null>(null);
  const [securityCode, setSecurityCode] = React.useState<string>("");
  const [inputCode, setInputCode] = React.useState<string>("");
  const [isResetting, setIsResetting] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);
  const [progressText, setProgressText] = React.useState<string>("");
  const [progressPercent, setProgressPercent] = React.useState<number>(0);

  const openModal = (scope: ResetScope) => {
    setActiveScope(scope);
    setSecurityCode(generateSecurityCode());
    setInputCode("");
    setIsResetting(false);
    setProgressText("");
    setProgressPercent(0);
    setCopied(false);
  };

  const closeModal = () => {
    if (isResetting) return; // işlem sürerken kapatmayı engelle
    setActiveScope(null);
    setInputCode("");
    setProgressText("");
    setProgressPercent(0);
  };

  const handleCopyCode = () => {
    if (!securityCode) return;
    navigator.clipboard.writeText(securityCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCodeValid = inputCode.trim().toUpperCase() === securityCode.trim().toUpperCase();

  const handleExecuteReset = async () => {
    if (!activeScope || !org?.id || !isCodeValid) return;

    setIsResetting(true);
    const scopeInfo = RESET_SCOPES[activeScope];

    try {
      await resetOrganizationData({
        orgId: org.id,
        scope: activeScope,
        qc,
        onProgress: (step, cur, total) => {
          setProgressText(step);
          setProgressPercent(Math.round((cur / total) * 100));
        },
      });

      toast.success(`${scopeInfo.title} başarıyla sıfırlandı.`, {
        description: "Veriler temizlendi ve önbellek güncellendi.",
      });

      // Modalı kapat
      setActiveScope(null);
    } catch (err: unknown) {
      console.error("Sıfırlama hatası:", err);
      toast.error("Veriler sıfırlanırken bir hata oluştu.", {
        description: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="border-warning/30 bg-warning-soft/20">
        <CardBody className="flex items-center gap-3 text-warning">
          <AlertTriangle className="size-5 shrink-0" />
          <p className="text-sm font-medium">
            Veri sıfırlama işlemlerini yalnızca firma sahibi ve sistem yöneticileri gerçekleştirebilir.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Üst Bilgi Kartı */}
      <Card className="border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
        <CardBody className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <ShieldAlert className="size-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text">Veri Sıfırlama ve Temizleme Merkezi</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              İşletmenize ait deneme verilerini, test kayıtlarını veya tüm verileri topluca temizleyebilirsiniz.
              Kazara silinmeyi engellemek amacıyla her işlemde ekranda gösterilen rastgele <strong>Güvenlik Onay Kodu</strong> girilmelidir.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Bu ekrandaki tüm işlemler kalıcıdır ve geri alınamaz. Lütfen dikkatle seçin.</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 3 Sıfırlama Seçeneği Kartları */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Seçenek 1: Ticari & Stok */}
        <ResetOptionCard
          scope={RESET_SCOPES.commercial_stock}
          icon={<Boxes className="size-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-500/10"
          buttonVariant="outline"
          buttonColor="hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-700 dark:text-amber-300"
          onSelect={() => openModal("commercial_stock")}
        />

        {/* Seçenek 2: Tüm Hareketler */}
        <ResetOptionCard
          scope={RESET_SCOPES.all_movements}
          icon={<Coins className="size-5 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-500/10"
          buttonVariant="outline"
          buttonColor="hover:bg-orange-500/10 hover:border-orange-500/30 text-orange-700 dark:text-orange-300"
          onSelect={() => openModal("all_movements")}
        />

        {/* Seçenek 3: Fabrika Ayarları */}
        <ResetOptionCard
          scope={RESET_SCOPES.factory_reset}
          icon={<RotateCcw className="size-5 text-rose-600 dark:text-rose-400" />}
          iconBg="bg-rose-500/10"
          buttonVariant="danger"
          onSelect={() => openModal("factory_reset")}
        />
      </div>

      {/* Güvenlik Doğrulama ve Onay Penceresi */}
      {activeScope && (
        <Dialog open={!!activeScope} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent
            title={RESET_SCOPES[activeScope].title}
            description="Lütfen silinecek verileri kontrol edin ve onay kodunu girin."
            className="sm:max-w-lg"
          >
            <div className="flex flex-col gap-4 text-sm">
              {/* Kırmızı İkaz Başlığı */}
              <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft/20 p-3.5 text-danger">
                <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs leading-relaxed">
                  <p className="font-bold text-sm">DİKKAT: BU İŞLEM GERİ ALINAMAZ!</p>
                  <p className="mt-0.5 opacity-90">
                    Seçilen veriler veritabanından kalıcı olarak silinecek ve ilgili tüm bakiyeler sıfırlanacaktır.
                  </p>
                </div>
              </div>

              {/* Silinecekler ve Korunacaklar Listesi */}
              <div className="rounded-xl border border-border bg-surface-2/40 p-3.5 flex flex-col gap-3">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-danger mb-1.5">
                    <XCircle className="size-4" /> Kalıcı Olarak Silinecekler:
                  </span>
                  <ul className="grid grid-cols-1 gap-1 text-[11px] text-muted pl-5 list-disc">
                    {RESET_SCOPES[activeScope].deletedItems.map((item, idx) => (
                      <li key={idx} className="leading-tight">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border pt-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-success mb-1.5">
                    <CheckCircle2 className="size-4" /> Korunacak Kayıtlar:
                  </span>
                  <ul className="grid grid-cols-1 gap-1 text-[11px] text-muted pl-5 list-disc">
                    {RESET_SCOPES[activeScope].keptItems.map((item, idx) => (
                      <li key={idx} className="leading-tight">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Güvenlik Onay Kodu Alanı */}
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3.5">
                <label className="text-xs font-medium text-text">
                  İşlemi onaylamak için aşağıdaki <strong>Güvenlik Kodunu</strong> girin:
                </label>

                {/* Kod Gösterim Kutusu */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <span className="font-mono text-base font-bold tracking-widest text-primary selection:bg-primary/20">
                    {securityCode}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={handleCopyCode}
                  >
                    {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    <span>{copied ? "Kopyalandı" : "Kodu Kopyala"}</span>
                  </Button>
                </div>

                {/* Kullanıcı Giriş Kutusu */}
                <div className="mt-1 flex flex-col gap-1">
                  <Input
                    autoFocus
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder={`Kodu buraya yazın (${securityCode})`}
                    disabled={isResetting}
                    className={cn(
                      "font-mono tracking-wider font-semibold text-center uppercase h-10",
                      isCodeValid && "border-success focus:border-success focus:ring-success/20",
                      inputCode && !isCodeValid && "border-danger focus:border-danger focus:ring-danger/20"
                    )}
                  />
                  <div className="flex items-center justify-between px-1 text-[11px]">
                    {!inputCode ? (
                      <span className="text-muted">Büyük/küçük harf duyarlı değildir.</span>
                    ) : isCodeValid ? (
                      <span className="font-medium text-success flex items-center gap-1">
                        <Check className="size-3.5" /> Onay kodu doğru, sıfırlamaya hazır.
                      </span>
                    ) : (
                      <span className="font-medium text-danger flex items-center gap-1">
                        <XCircle className="size-3.5" /> Kod eşleşmiyor, lütfen tam olarak yazın.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* İlerleme Durumu */}
              {isResetting && (
                <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-2 text-text">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      {progressText || "Sıfırlama başlatılıyor..."}
                    </span>
                    <span className="font-mono text-primary font-bold">%{progressPercent}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Butonlar */}
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="ghost" onClick={closeModal} disabled={isResetting}>
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={!isCodeValid || isResetting}
                  onClick={handleExecuteReset}
                  className="gap-2"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Sıfırlanıyor...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" />
                      <span>{RESET_SCOPES[activeScope].confirmButtonText}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ResetOptionCard({
  scope,
  icon,
  iconBg,
  buttonVariant = "outline",
  buttonColor,
  onSelect,
}: {
  scope: (typeof RESET_SCOPES)[ResetScope];
  icon: React.ReactNode;
  iconBg: string;
  buttonVariant?: "outline" | "danger" | "primary";
  buttonColor?: string;
  onSelect: () => void;
}) {
  return (
    <Card className="flex flex-col justify-between transition-all hover:border-border-hover hover:shadow-md">
      <div>
        <CardHeader
          title={
            <div className="flex items-center gap-2.5">
              <div className={cn("flex size-8 items-center justify-center rounded-lg", iconBg)}>
                {icon}
              </div>
              <span className="text-sm font-semibold">{scope.title}</span>
            </div>
          }
        />
        <CardBody className="flex flex-col gap-4 text-xs">
          <div>
            <span className="inline-block rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
              {scope.badge}
            </span>
            <p className="mt-2 text-muted leading-relaxed">{scope.description}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg bg-surface-2/40 p-2.5">
            <span className="font-semibold text-danger flex items-center gap-1">
              <Trash2 className="size-3.5" /> Silinecekler:
            </span>
            <ul className="list-disc pl-4 text-[11px] text-muted space-y-1">
              {scope.deletedItems.slice(0, 4).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
              {scope.deletedItems.length > 4 && (
                <li className="text-muted/70 italic">+{scope.deletedItems.length - 4} diğer işlem...</li>
              )}
            </ul>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg bg-success-soft/20 p-2.5">
            <span className="font-semibold text-success flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Korunacaklar:
            </span>
            <ul className="list-disc pl-4 text-[11px] text-muted space-y-1">
              {scope.keptItems.slice(0, 3).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
              {scope.keptItems.length > 3 && (
                <li className="text-muted/70 italic">+{scope.keptItems.length - 3} diğer tanım...</li>
              )}
            </ul>
          </div>
        </CardBody>
      </div>

      <div className="border-t border-border p-4">
        <Button
          type="button"
          variant={buttonVariant}
          onClick={onSelect}
          className={cn("w-full justify-center gap-2", buttonColor)}
        >
          <Trash2 className="size-4" />
          <span>{scope.confirmButtonText}</span>
        </Button>
      </div>
    </Card>
  );
}
