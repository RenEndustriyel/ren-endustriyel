"use client";

import * as React from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { currentSubscription, disablePush, enablePush, pushSupported, refreshRates, testPush } from "@/lib/push";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatNumber } from "@/lib/format";
import { useRates } from "@/lib/rates";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function NotificationSettings() {
  const [on, setOn] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    currentSubscription().then((s) => setOn(!!s));
  }, []);
  const supported = typeof window !== "undefined" && pushSupported();

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
        toast.success("Bildirimler kapatıldı");
      } else {
        await enablePush();
        setOn(true);
        toast.success("Bildirimler açıldı");
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader icon={<Bell />} title="Bildirimler" action={on !== null && <Badge tone={on ? "success" : "neutral"}>{on ? "Açık" : "Kapalı"}</Badge>} />
      <CardBody className="flex flex-col gap-3 text-sm">
        <p className="text-muted">
          Bu cihazda şu bildirimleri alırsınız: ajandadaki hatırlatmalar ve her sabah 08:30&apos;da günlük özet (bugün vadesi gelen tahsilat/ödeme, geciken işlemler,
          vadesi gelen çek-senetler). Her cihaz için ayrı açılır.
        </p>
        {!supported && <p className="rounded-lg bg-warning-soft px-3 py-2 text-warning">Bu tarayıcı bildirim desteklemiyor. iPhone&apos;da önce Paylaş → Ana Ekrana Ekle ile uygulamayı yükleyin.</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={toggle} loading={busy} disabled={!supported || on === null} variant={on ? "outline" : "primary"}>
            {on ? <BellOff /> : <Bell />} {on ? "Bu cihazda kapat" : "Bu cihazda aç"}
          </Button>
          {on && (
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  const r = await testPush();
                  toast.success(r.sent ? "Deneme bildirimi gönderildi" : "Gönderilecek abonelik bulunamadı");
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
            >
              <Send /> Deneme gönder
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export function RatesSettings() {
  const rates = useRates();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const list = Object.values(rates.data ?? {}).filter((r) => ["USD", "EUR", "GBP", "CHF"].includes(r.currency));
  return (
    <Card>
      <CardHeader
        title="Döviz kurları (TCMB)"
        action={
          <Button
            size="sm"
            variant="outline"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await refreshRates();
                toast.success(`Kurlar güncellendi (${formatDate(r.date)})`);
                qc.invalidateQueries({ queryKey: ["rates"] });
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Canlı kuru çek
          </Button>
        }
      />
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2 text-left">Döviz</th>
              <th className="px-4 py-2 text-right">Döviz alış</th>
              <th className="px-4 py-2 text-right">Döviz satış</th>
              <th className="px-4 py-2 text-right">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((r) => (
              <tr key={r.currency}>
                <td className="px-4 py-2 font-medium">{r.currency}</td>
                <td className="num px-4 py-2 text-right">{formatNumber(r.forex_buying)}</td>
                <td className="num px-4 py-2 text-right">{formatNumber(r.forex_selling)}</td>
                <td className="px-4 py-2 text-right text-muted">{formatDate(r.rate_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-4 text-sm text-muted">Henüz kur yok.</p>}
      </div>
      <p className="px-4 py-3 text-xs text-muted">Kurlar hafta içi 10:00 ve 15:45&apos;te otomatik güncellenir. Dövizli belgelerde döviz alış kuru önerilir; belgede elle değiştirilebilir.</p>
    </Card>
  );
}
