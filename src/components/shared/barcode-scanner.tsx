"use client";

import * as React from "react";
import { ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/**
 * Kamera ile barkod okuma. BarcodeDetector (Android Chrome) varsa onu, yoksa ZXing kullanır.
 */
export function BarcodeScanner({ open, onOpenChange, onDetected }: { open: boolean; onOpenChange: (o: boolean) => void; onDetected: (code: string) => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let zxingControls: { stop: () => void } | null = null;
    let raf = 0;

    const done = (code: string) => {
      if (stopped) return;
      stopped = true;
      navigator.vibrate?.(60);
      onDetected(code);
      onOpenChange(false);
    };

    (async () => {
      try {
        const video = videoRef.current!;
        const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        if (BD) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          video.srcObject = stream;
          await video.play();
          const detector = new BD({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code", "itf"] });
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) return done(codes[0].rawValue);
            } catch {}
            raf = requestAnimationFrame(tick);
          };
          tick();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          zxingControls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, video, (result) => {
            if (result) done(result.getText());
          });
        }
      } catch (e) {
        setError((e as Error).name === "NotAllowedError" ? "Kamera izni verilmedi." : "Kamera açılamadı: " + (e as Error).message);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(o) => { setError(null); onOpenChange(o); }}>
      <DialogContent title="Barkod okut" description="Barkodu kameranın ortasına getirin">
        {error ? (
          <p className="py-6 text-center text-sm text-danger">{error}</p>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-danger shadow-[0_0_12px_var(--danger)]" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ScanButton({ onDetected, className, label }: { onDetected: (code: string) => void; className?: string; label?: string }) {
  const [open, setOpen] = React.useState(false);
  const handle = React.useCallback(
    (c: string) => {
      toast.success(`Barkod: ${c}`);
      onDetected(c);
    },
    [onDetected],
  );
  return (
    <>
      <Button type="button" variant="outline" size={label ? "md" : "icon"} className={className} onClick={() => setOpen(true)} aria-label="Barkod okut">
        <ScanBarcode />
        {label}
      </Button>
      <BarcodeScanner open={open} onOpenChange={setOpen} onDetected={handle} />
    </>
  );
}
