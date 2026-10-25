"use client";

// Hesap makinesi: zincirleme iskonto, kâr ekleme, kâr oranı bulma. Sadece hesaplar, hiçbir kayda dokunmaz.
import * as React from "react";
import { Calculator, Copy, Check, X } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const num = (s: string) => {
  const t = s.trim().replace(/\s/g, "").replace("%", "");
  if (t === "") return NaN;
  // "1.250,50" → 1250.50 ; "1250.5" → 1250.5
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? n : NaN;
};
const pct = (n: number) => "%" + n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const parseRates = (s: string) => s.split("+").map(num).filter((r) => Number.isFinite(r) && r !== 0);

// "10+5" oranlarını sırayla uygular (sign: -1 iskonto, +1 kâr)
function chain(base: number, rates: number[], sign: 1 | -1) {
  const steps: { rate: number; diff: number; after: number }[] = [];
  let cur = base;
  for (const rate of rates) {
    const diff = (cur * rate) / 100;
    cur += sign * diff;
    steps.push({ rate, diff, after: cur });
  }
  return { steps, result: cur };
}

export function IskontoHesapButton({ variant = "chip" }: { variant?: "chip" | "sidebar" | "icon" }) {
  const [open, setOpen] = React.useState(false);
  const modal = open && <HesapModal onClose={() => setOpen(false)} />;
  if (variant === "sidebar")
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
          <Calculator size={20} className="text-slate-400" />
          Hesap Makinesi
        </button>
        {modal}
      </>
    );
  if (variant === "icon")
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} title="Hesap Makinesi" className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <Calculator size={16} />
        </button>
        {modal}
      </>
    );
  // Ana sayfa Hızlı İşlemler (sadece mobilde; masaüstünde sol menüde var)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950/40"
      >
        <Calculator size={14} />
        Hesapla
      </button>
      {modal}
    </>
  );
}

type Mode = "iskonto" | "kar" | "oran";
const MODES: { id: Mode; label: string }[] = [
  { id: "iskonto", label: "İskonto Düş" },
  { id: "kar", label: "Kâr Ekle" },
  { id: "oran", label: "Kâr Oranı" },
];
const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800";

function Field({ label, value, onChange, placeholder, hint, autoFocus }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string; autoFocus?: boolean }) {
  return (
    <div className="mt-3">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input autoFocus={autoFocus} inputMode="decimal" className={input} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function HesapModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = React.useState<Mode>("iskonto");
  const [a, setA] = React.useState("");
  const [b, setB] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const A = num(a);
  const B = num(b);
  let result: number | null = null;
  let resultText = "—";
  let detail: React.ReactNode = null;

  if (mode === "iskonto" || mode === "kar") {
    const rates = parseRates(b);
    if (Number.isFinite(A)) {
      const sign = mode === "iskonto" ? -1 : 1;
      const { steps, result: r } = chain(A, rates, sign);
      result = Math.round(r * 100) / 100;
      resultText = formatMoney(result);
      if (steps.length)
        detail = (
          <>
            {steps.map((s, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="text-slate-500">{pct(s.rate)} {mode === "iskonto" ? "iskonto" : "kâr"}</span>
                <span>{sign < 0 ? "−" : "+"}{formatMoney(s.diff)} → {formatMoney(s.after)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-500 dark:border-slate-700">
              <span>{mode === "iskonto" ? "Toplam indirim" : "Toplam kâr"}</span>
              <span>{A ? pct(Math.abs(r / A - 1) * 100) : ""} · {formatMoney(Math.abs(r - A))}</span>
            </div>
          </>
        );
    }
  } else if (Number.isFinite(A) && Number.isFinite(B) && A > 0) {
    const kar = B - A;
    const markup = (kar / A) * 100;
    result = Math.round(markup * 100) / 100;
    resultText = pct(markup);
    detail = (
      <>
        <div className="flex justify-between"><span className="text-slate-500">Kâr tutarı</span><span>{formatMoney(kar)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Alışa göre kâr (maliyet üstü)</span><span>{pct(markup)}</span></div>
        {B > 0 && <div className="flex justify-between"><span className="text-slate-500">Satışa göre kâr (marj)</span><span>{pct((kar / B) * 100)}</span></div>}
      </>
    );
  }

  const copy = async () => {
    if (result == null) return;
    try {
      await navigator.clipboard.writeText(result.toFixed(2).replace(".", ","));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5 bg-white dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Calculator size={18} /> Hesap Makinesi
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setMode(m.id); setB(""); }}
              className={cn("rounded-lg py-1.5 text-[13px] font-semibold transition", mode === m.id ? "bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300" : "text-slate-500 hover:text-slate-700")}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "iskonto" && (
          <>
            <Field autoFocus label="Tutar (TL)" value={a} onChange={setA} placeholder="1000" />
            <Field label="İskonto oranları" value={b} onChange={setB} placeholder="10+5" hint="Oranları + ile ayırın. Her oran kalan tutara uygulanır." />
          </>
        )}
        {mode === "kar" && (
          <>
            <Field autoFocus label="Alış fiyatı (TL)" value={a} onChange={setA} placeholder="1000" />
            <Field label="Kâr oranı" value={b} onChange={setB} placeholder="25" hint="Birden fazla oran için + kullanın (ör. 20+10)." />
          </>
        )}
        {mode === "oran" && (
          <>
            <Field autoFocus label="Alış fiyatı (TL)" value={a} onChange={setA} placeholder="1000" />
            <Field label="Satış fiyatı (TL)" value={b} onChange={setB} placeholder="1300" />
          </>
        )}

        {detail && <div className="mt-4 space-y-1 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">{detail}</div>}

        <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-950/40">
          <div>
            <div className="text-xs text-slate-500">{mode === "kar" ? "Satış fiyatı" : mode === "oran" ? "Kâr oranı" : "Sonuç"}</div>
            <div className="text-2xl font-bold">{resultText}</div>
          </div>
          <button
            type="button"
            disabled={result == null}
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
      </div>
    </div>
  );
}
