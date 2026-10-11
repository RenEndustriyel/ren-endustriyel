"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { waLink } from "./store-shared";

const KEY = "ren-magaza-bilgi-ok";

/** Sabit WhatsApp sipariş düğmesi ve tarayıcı depolama bilgilendirmesi */
export function StoreFloating() {
  const [notice, setNotice] = React.useState(false);
  React.useEffect(() => {
    try {
      setNotice(window.localStorage.getItem(KEY) !== "1"); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      // depolama kapalıysa bilgilendirme gösterilmez
    }
  }, []);
  const close = () => {
    setNotice(false);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // yoksay
    }
  };

  return (
    <>
      <a
        href={waLink("Merhaba, sipariş vermek istiyorum.")}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-3 z-30 inline-flex h-12 items-center gap-2 rounded-lg bg-[#133258] px-4 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition hover:bg-[#0c2340] lg:bottom-5 lg:right-5 lg:px-5"
      >
        <MessageCircle size={21} /> <span className="hidden sm:inline">Siparişleriniz için…</span>
      </a>
      {notice && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-white/10 bg-[#1b1b2b]/95 px-4 py-3 text-[12px] leading-5 text-white/85 lg:inset-x-auto lg:bottom-5 lg:left-5 lg:max-w-md lg:rounded-xl lg:border">
          <button type="button" aria-label="Kapat" onClick={close} className="float-right -mr-1 -mt-1 ml-2 grid size-7 place-items-center rounded-full hover:bg-white/10">
            <X size={15} />
          </button>
          Sepetiniz ve favorileriniz, alışverişinizi sürdürebilmeniz için bu cihazda saklanır. Ayrıntılar için{" "}
          <Link href="/yasal" className="font-semibold text-white underline">
            KVKK metnine
          </Link>{" "}
          bakabilirsiniz.
        </div>
      )}
    </>
  );
}
