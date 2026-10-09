"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Send, X } from "lucide-react";

import { CONTACT } from "./contact";

const NAV = [
  { href: "#urunler", label: "Ürünler" },
  { href: "#markalar", label: "Markalar" },
  { href: "#sektorler", label: "Kurumlar" },
  { href: "#hizmetler", label: "Neden Ren" },
  { href: "#iletisim", label: "İletişim" },
];

/** Üst menü (mobilde açılır) */
export function LandingHeader() {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a2a5e]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5">
          <span className="relative h-10 w-10 overflow-hidden rounded-full bg-[#0d3b80] ring-1 ring-white/20">
            <Image src="/images/ren-logo-3d.png" alt="Ren Endüstriyel" fill sizes="40px" className="scale-[1.65] object-cover" priority />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-wide">REN ENDÜSTRİYEL</span>
            <span className="block text-[11px] text-white/70">Toptan & Perakende</span>
          </span>
        </a>
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <a href="#teklif" className="hidden rounded-lg bg-[#5cb531] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#4ea12a] sm:inline-flex">
            Teklif Al
          </a>
          <Link href="/giris" className="hidden rounded-lg border border-white/30 px-3.5 py-2 text-sm font-semibold transition hover:bg-white/10 sm:inline-flex">
            Müşteri Girişi
          </Link>
          <button type="button" className="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Menü" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-white/10 px-4 pb-4 lg:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10">
              {n.label}
            </a>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a href="#teklif" onClick={() => setOpen(false)} className="rounded-lg bg-[#5cb531] py-2.5 text-center text-sm font-bold">
              Teklif Al
            </a>
            <Link href="/giris" className="rounded-lg border border-white/30 py-2.5 text-center text-sm font-semibold">
              Müşteri Girişi
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

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
  const input = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1565c0] focus:ring-2 focus:ring-[#1565c0]/20";
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
      <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565c0] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d4fa0]">
        <Send size={16} /> Teklif talebini gönder
      </button>
      <p className="text-center text-xs text-slate-500">“Gönder” düğmesine basınca e-posta programınızda teklif talebiniz hazır açılır.</p>
    </form>
  );
}
