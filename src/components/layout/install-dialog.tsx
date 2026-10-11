"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Share, PlusSquare, Smartphone, CheckCircle2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./brand";

interface InstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isIOS?: boolean;
}

export function InstallDialog({ open, onOpenChange, isIOS }: InstallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Ren Ön Muhasebe'yi Yükleyin"
        description="Telefonunuza, tabletinize veya bilgisayarınıza yükleyin. Tek dokunuşla açın, internet olmasa bile kullanın."
      >
        <div className="flex flex-col items-center text-center pt-1 pb-3">
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-surface-2 shadow-inner">
            <BrandMark size={42} />
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary flex items-start gap-2.5">
            <WifiOff className="size-4 shrink-0 mt-0.5" />
            <div>
              <strong>Çevrimdışı Çalışma Desteği:</strong> Yüklendiğinde internet bağlantınız olmasa bile cari, ürün ve geçmiş hareketlerinizi görüntüleyebilir, yeni işlem ekleyebilirsiniz.
            </div>
          </div>

          <div className="space-y-3 text-xs text-text">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                1
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold flex items-center gap-1.5">
                  {isIOS ? (
                    <>
                      Safari&apos;de Paylaş Simgesine Dokunun
                      <Share className="size-3.5 text-primary" />
                    </>
                  ) : (
                    <>
                      Tarayıcı Menüsünü Açın veya Yükle&apos;ye Basın
                      <Smartphone className="size-3.5 text-primary" />
                    </>
                  )}
                </div>
                <p className="text-muted text-[11px]">
                  {isIOS
                    ? "Ekranın altındaki (veya iPad'de üstteki) kare içinde yukarı ok olan Paylaş butonuna dokunun."
                    : "Tarayıcınızın menüsünden (üç nokta) 'Uygulamayı Yükle' veya 'Ana Ekrana Ekle' seçeneğini seçin."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                2
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold flex items-center gap-1.5">
                  &quot;Ana Ekrana Ekle&quot; Seçeneğine Dokunun
                  <PlusSquare className="size-3.5 text-primary" />
                </div>
                <p className="text-muted text-[11px]">
                  Açılan menüyü aşağı kaydırıp &quot;Ana Ekrana Ekle&quot; (Add to Home Screen) satırını seçin.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                3
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold flex items-center gap-1.5">
                  &quot;Ekle&quot; Butonuna Basın
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                </div>
                <p className="text-muted text-[11px]">
                  Sağ üst köşedeki &quot;Ekle&quot; butonuna dokunun. Uygulama logonuzla birlikte ana ekranınıza gelecektir.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Anladım
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
