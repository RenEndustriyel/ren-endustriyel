"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ADSENSE_CLIENT, GA_ID } from "./site-data";

/**
 * Herkese açık sayfalar (kurumsal site + mağaza) için Google Analytics 4 ve AdSense.
 * ERP ekranlarına eklenmez. Kimlikler boşsa hiçbir şey yüklenmez.
 * Google Consent Mode v2: izin verilene kadar çerez/kişiselleştirme kapalı (KVKK).
 */
const CONSENT_KEY = "ren-cerez-izni";

type Choice = "granted" | "denied";

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function applyConsent(choice: Choice) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
}

/** Kendi trafik sayacımız (/api/ziyaret): çerezsiz, kişi tanımlamaz; izin şeridinden bağımsız çalışır */
function sendVisit(e: string, p: string) {
  try {
    const body = JSON.stringify({ e, p, r: e === "pageview" ? document.referrer : undefined });
    if (!navigator.sendBeacon?.("/api/ziyaret", body)) fetch("/api/ziyaret", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {}
}

function useVisitCounter() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) sendVisit("pageview", pathname);
  }, [pathname]);
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href") ?? "";
      const e = /wa.me|whatsapp/i.test(href) ? "whatsapp" : href.startsWith("tel:") ? "phone" : /teklif/i.test(href) ? "teklif" : null;
      if (e) sendVisit(e, location.pathname);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}

export function PublicTracking() {
  useVisitCounter();
  const [choice, setChoice] = useState<Choice | null | undefined>(undefined);

  useEffect(() => {
    const c = readChoice();
    setChoice(c);
    if (c) applyConsent(c);
  }, []);

  if (!GA_ID && !ADSENSE_CLIENT) return null;

  const decide = (c: Choice) => {
    try {
      localStorage.setItem(CONSENT_KEY, c);
    } catch {}
    applyConsent(c);
    setChoice(c);
  };

  return (
    <>
      <script
        id="consent-default"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{var c=localStorage.getItem('${CONSENT_KEY}');if(c==='granted'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}${GA_ID ? `
gtag('js',new Date());gtag('config','${GA_ID}');` : ""}`,
        }}
      />
      {GA_ID && <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />}
      {ADSENSE_CLIENT && (
        // Düz <script>: AdSense doğrulaması etiketi sunucu HTML'inde arar (next/script yalnızca preload bırakıyordu)
        <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous" />
      )}
      {choice === null && (
        <div className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-xl lg:bottom-4">
          <p>
            Sitemizi geliştirmek ve size uygun reklamlar göstermek için çerezler kullanıyoruz. Kabul etmezseniz yalnızca
            zorunlu çerezler kullanılır.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => decide("denied")} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50">
              Reddet
            </button>
            <button type="button" onClick={() => decide("granted")} className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700">
              Kabul Et
            </button>
          </div>
        </div>
      )}
    </>
  );
}
