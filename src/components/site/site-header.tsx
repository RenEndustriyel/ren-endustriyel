"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Menu, Phone, X } from "lucide-react";
import { CONTACT, NAV } from "./site-data";
import { SiteWordmark } from "./site-ui";

/** Kurumsal site üst bilgi çubuğu + menü (mobilde açılır) */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]); // eslint-disable-line react-hooks/set-state-in-effect
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40">
      <div className="hidden bg-[#1f382b] text-xs text-white/75 md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center gap-6 px-6">
          <span>
            {CONTACT.address}, {CONTACT.city}
          </span>
          <a href={`tel:${CONTACT.tel}`} className="ml-auto inline-flex items-center gap-1.5 hover:text-white">
            <Phone size={13} /> {CONTACT.phone}
          </a>
          <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
            <Mail size={13} /> {CONTACT.email}
          </a>
        </div>
      </div>
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Ren Endüstriyel ana sayfa" className="flex items-center">
            <SiteWordmark />
          </Link>
          <nav className="ml-auto hidden items-center gap-0.5 xl:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active(n.href) ? "text-[#2e684b]" : "text-slate-700 hover:text-[#24372c]"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 xl:ml-3">
            <Link href="/iletisim#teklif" className="hidden rounded-md bg-[#244e39] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#183d2c] sm:inline-flex">
              Teklif Al
            </Link>
            <button type="button" className="rounded-lg p-2 text-[#24372c] hover:bg-slate-100 xl:hidden" aria-label="Menü" onClick={() => setOpen((o) => !o)}>
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-slate-200 bg-white px-4 pb-4 xl:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`block rounded-lg px-3 py-3 text-sm font-semibold ${active(n.href) ? "text-[#2e684b]" : "text-slate-800"}`}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-1 gap-2">
              <Link href="/iletisim#teklif" className="rounded-lg bg-[#244e39] py-3 text-center text-sm font-bold text-white">
                Teklif Al
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
