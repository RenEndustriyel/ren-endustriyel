"use client";

import * as React from "react";
import { Download, HardDrive, Clock, CheckCircle2, ShieldCheck, RefreshCw, FolderDown, FileCode2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "@/providers/org-provider";
import { createFullBackup, downloadBackupJson, type BackupData } from "@/lib/backup";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BackupSettings() {
  const { org } = useOrg();
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<{ table: string; step: number; total: number } | null>(null);
  const [lastBackup, setLastBackup] = React.useState<BackupData | null>(null);

  // Otomatik yedekleme yapılandırma durumları
  const [folderPath, setFolderPath] = React.useState("C:\\RenMuhasebe_Yedekler");
  const [backupMode, setBackupMode] = React.useState<"dated" | "overwrite">("dated");
  const [backupTime, setBackupTime] = React.useState("08:00");
  const [copied, setCopied] = React.useState(false);

  // Manuel anlık yedek alma
  const handleCreateBackup = async () => {
    if (!org) return;
    setLoading(true);
    setProgress({ table: "Başlatılıyor...", step: 0, total: 31 });

    try {
      const backup = await createFullBackup(org.id, org.name, (table, step, total) => {
        setProgress({ table, step, total });
      });

      setLastBackup(backup);
      downloadBackupJson(backup);
      toast.success("Yedekleme başarıyla tamamlandı ve dosya indirildi!", {
        description: `Toplam ${backup.totalRecords.toLocaleString("tr-TR")} kayıt yedeklendi.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Yedek alınırken bir hata oluştu: " + msg);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const copyTaskCommand = () => {
    const cmd = `schtasks /create /tn "RenMuhasebe_GunlukYedek" /tr "node \\"${folderPath}\\\\backup-daily.mjs\\"" /sc daily /st ${backupTime} /f`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    toast.success("Komut panoya kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Anlık Manuel Yedek */}
      <Card>
        <CardHeader
          icon={<Download className="size-4" />}
          title="Canlı Veritabanı Yedeği İndir"
        />
        <CardBody className="space-y-4">
          <p className="text-xs text-muted">
            Mevcut tüm carileri, ürünleri, faturaları, stok hareketlerini ve kasa/banka kayıtlarını tek tıkla bilgisayarınıza indirin.
          </p>

          <div className="rounded-lg border border-border bg-surface-2 p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium text-text">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Tam ve Güvenli Veri Kapsamı</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Yedekleme dosyanız ({org?.name || "Ren Endüstriyel"}) firmasına ait tüm müşteri/tedarikçi kartlarını,
              ürün stoklarını, fatura ve irsaliyeleri, tahsilat ve ödeme hareketlerini eksiksiz içerir.
            </p>
            {lastBackup && (
              <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Son indirilen yedek: {new Date(lastBackup.exportedAt).toLocaleTimeString("tr-TR")} · {lastBackup.totalRecords} kayıt</span>
              </div>
            )}
          </div>

          {progress && (
            <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-primary truncate">Yedekleniyor: {progress.table}</span>
                <span className="text-muted">{progress.step} / {progress.total}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${Math.round((progress.step / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleCreateBackup} disabled={loading} className="gap-2">
              {loading ? <RefreshCw className="size-4 animate-spin" /> : <FolderDown className="size-4" />}
              {loading ? "Yedek Alınıyor..." : "Şimdi Yedek İndir (JSON)"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 2. Otomatik Günlük Yedekleme Ayarı (Masaüstü & Belirlenen Klasör) */}
      <Card>
        <CardHeader
          icon={<Clock className="size-4" />}
          title="Otomatik Günlük Yedekleme (Klasör & Zaman Ayarı)"
        />
        <CardBody className="space-y-4">
          <p className="text-xs text-muted">
            Her sabah belirlediğiniz saatte canlı sistemden seçtiğiniz klasöre otomatik yedek alır.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="folder-path" className="flex items-center gap-1.5">
                <HardDrive className="size-3.5 text-muted" />
                Yedeklenecek Klasör Yolu
              </Label>
              <Input
                id="folder-path"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Örn: C:\RenMuhasebe_Yedekler"
              />
              <p className="text-[11px] text-muted">
                Her sabah dosyalar bu klasöre kaydedilir.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backup-time" className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted" />
                Yedekleme Saati
              </Label>
              <Input
                id="backup-time"
                type="time"
                value={backupTime}
                onChange={(e) => setBackupTime(e.target.value)}
              />
              <p className="text-[11px] text-muted">
                Varsayılan: Her sabah saat 08:00
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Yedekleme Formatı / Modu</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                onClick={() => setBackupMode("dated")}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
                  backupMode === "dated"
                    ? "border-primary bg-primary/5 text-text"
                    : "border-border hover:bg-surface-2 text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="backupMode"
                  checked={backupMode === "dated"}
                  onChange={() => setBackupMode("dated")}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-text">Tarih Tarih Sakla (Önerilen)</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    Her gün yeni bir dosya oluşturur: <code className="text-primary font-mono">Ren_Yedek_2026-09-28.json</code>. Geçmişe dönük tüm yedekler korunur.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setBackupMode("overwrite")}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
                  backupMode === "overwrite"
                    ? "border-primary bg-primary/5 text-text"
                    : "border-border hover:bg-surface-2 text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="backupMode"
                  checked={backupMode === "overwrite"}
                  onChange={() => setBackupMode("overwrite")}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-text">Üstüne Yaz (Tek Dosya)</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    Her sabah mevcut dosyanın üstüne yazar: <code className="text-primary font-mono">Ren_Yedek_Guncel.json</code>. Disk alanı tasarrufu sağlar.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Kolay Kurulum Kutusu */}
          <div className="rounded-lg border border-border bg-surface-2 p-4 text-xs space-y-3">
            <div className="flex items-center gap-2 font-semibold text-text">
              <FileCode2 className="size-4 text-primary" />
              <span>Tek Tıkla Windows Görev Zamanlayıcısına Ekle</span>
            </div>
            <p className="text-muted leading-relaxed">
              Bilgisayarınızda proje klasöründeki <code className="rounded bg-surface px-1 py-0.5 font-mono text-primary">scripts/kur-gunluk-yedek.bat</code> dosyasını
              çift tıklayarak çalıştırdığınızda, Windows Görev Zamanlayıcısı her sabah saat {backupTime}&apos;de otomatik olarak canlıdan yedeği alıp{" "}
              <strong>{folderPath}</strong> klasörüne bırakacaktır.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={copyTaskCommand}
                className="gap-1.5 text-xs"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copied ? "Kopyalandı" : "Windows Komutunu Kopyala"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 3. Bulut Yedek Güvencesi */}
      <Card>
        <CardHeader
          icon={<ShieldCheck className="size-4 text-emerald-500" />}
          title="Bulut & GitHub Otomatik Yedeği"
        />
        <CardBody>
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Aktif Güvence:</strong> Canlı sisteminiz Supabase üzerinde her an bulut yedeklemesi ile korunmakta olup,
              ayrıca GitHub Actions üzerinde yapılandırılan günlük görev ile her sabah canlı veri tabanınızın güvenli şifreli arşivi oluşturulmaktadır.
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
