"use client";

import * as React from "react";
import { Send } from "lucide-react";

import { CONTACT } from "./contact";

/** Teklif formu: e-posta programında hazır bir teklif talebi açar */
export function QuoteForm() {
  const [f, setF] = React.useState({ ad: "", kurum: "", telefon: "", ihtiyac: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Teklif talebi — ${f.kurum || f.ad}`;
    const body = [`Ad Soyad: ${f.ad}`, `Kurum / Firma: ${f.kurum}`, `Telefon: ${f.telefon}`, "", "İhtiyaç listesi:", f.ihtiyac].join("\n");
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const input = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0e9f9a] focus:ring-2 focus:ring-[#0e9f9a]/20";
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Ad Soyad *</span>
          <input required className={input} value={f.ad} onChange={set("ad")} autoComplete="name" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Kurum / Firma</span>
          <input className={input} value={f.kurum} onChange={set("kurum")} autoComplete="organization" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Telefon *</span>
        <input required type="tel" className={input} value={f.telefon} onChange={set("telefon")} autoComplete="tel" placeholder="05xx xxx xx xx" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">İhtiyaç listesi *</span>
        <textarea
          required
          rows={4}
          className={input}
          value={f.ihtiyac}
          onChange={set("ihtiyac")}
          placeholder={"Örn: 20 adet çamaşır suyu 5 L, 10 koli içten çekmeli havlu, aylık düzenli teslimat…"}
        />
      </label>
      <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e9f9a] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b8783]">
        <Send size={16} /> Teklif talebini gönder
      </button>
      <p className="text-center text-xs text-slate-500">“Gönder” düğmesine basınca e-posta programınızda teklif talebiniz hazır açılır.</p>
    </form>
  );
}
