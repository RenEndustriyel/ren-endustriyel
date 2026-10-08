"use client";

import * as React from "react";

const PREFIX = "ren-ekran:";

/**
 * Ekran durumu (arama, filtre, sıralama…) oturum boyunca saklanır: bir kayda girip geri
 * dönüldüğünde ekran aynı şekilde açılır. Program/sekme kapanınca sıfırlanır.
 */
export function useSessionState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(initial);
  const skipSave = React.useRef(true);
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      if (raw != null) setValue(JSON.parse(raw) as T); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, [key]);
  React.useEffect(() => {
    // ilk çizimdeki varsayılan değer kayıtlı değeri ezmesin
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

/** Liste sayfasının kaydırma konumu: ayrılırken saklanır, veri hazır olunca geri getirilir */
export function useScrollRestore(key: string, ready: boolean) {
  const restored = React.useRef(false);
  React.useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(PREFIX + key + ":kaydirma", String(window.scrollY));
      } catch {}
    };
    window.addEventListener("scroll", save, { passive: true });
    // yalnızca kaydırırken sakla (ayrılırken yeni sayfa en üste kaymış olabilir)
    return () => window.removeEventListener("scroll", save);
  }, [key]);
  React.useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    let y = 0;
    try {
      y = Number(sessionStorage.getItem(PREFIX + key + ":kaydirma")) || 0;
    } catch {}
    if (y > 0) requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  }, [ready, key]);
}
