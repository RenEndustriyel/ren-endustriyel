"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryOf } from "./store-shared";

export type HeroSlide = {
  kicker: string;
  title: string;
  bullets: string[];
  cta: string;
  href: string;
  /** Arka plan rengi */
  bg: string;
  /** Ürün görselleri; yoksa kategori simgeleri gösterilir */
  images?: { src: string; alt: string }[];
  cats?: string[];
};

/** Ana sayfa afiş kaydırıcısı (6 sn'de bir ilerler, üzerine gelince durur) */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const go = (n: number) => setI((n + slides.length) % slides.length);

  React.useEffect(() => {
    if (paused) return;
    const t = window.setInterval(
      () => setI((v) => (v + 1) % slides.length),
      6000,
    );
    return () => window.clearInterval(t);
  }, [paused, slides.length]);

  const arrow =
    "absolute top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white transition hover:bg-black/45 sm:grid";

  return (
    <div
      className="relative h-[440px] overflow-hidden rounded-md sm:h-[400px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="kaydırıcı"
    >
      {slides.map((s, n) => (
        <div
          key={s.title}
          aria-hidden={n !== i}
          className={`absolute inset-0 grid items-center gap-4 p-6 text-white transition-opacity duration-500 sm:grid-cols-[0.9fr_1fr] sm:px-16 lg:grid-cols-[0.85fr_1fr_0.9fr] ${n === i ? "opacity-100" : "pointer-events-none opacity-0"}`}
          style={{ backgroundColor: s.bg }}
        >
          <div className="flex h-[150px] items-center justify-center gap-3 sm:h-[250px]">
            {s.images
              ? s.images.map((img) => (
                  <div
                    key={img.src}
                    className={`relative h-full flex-1 rounded-md bg-white`}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      priority={n === 0}
                      sizes="(max-width: 640px) 30vw, 150px"
                      className="object-contain p-2"
                    />
                  </div>
                ))
              : (s.cats ?? []).map((slug) => {
                  const c = categoryOf(slug);
                  return (
                    <div
                      key={slug}
                      className={`flex h-full flex-1 flex-col items-center justify-center gap-2 rounded-md`}
                      style={{ backgroundColor: c.tint, color: c.ink }}
                    >
                      <c.icon className="size-9 sm:size-14" strokeWidth={1.4} />
                      <span className="px-1 text-center text-[10px] font-extrabold uppercase tracking-[0.08em] sm:text-xs">
                        {c.short}
                      </span>
                    </div>
                  );
                })}
          </div>

          <div className="text-center">
            <div className="text-xl font-light sm:text-[27px]">{s.kicker}</div>
            <div
              style={{ borderColor: "#ec1c23" }}
              className="mx-auto mt-3 inline-block rounded-[50%] border-[3px] px-7 py-4 text-2xl font-black uppercase italic leading-[1.05] tracking-tight sm:px-9 sm:py-5 sm:text-[30px]"
            >
              {s.title}
            </div>
            <div className="mt-5">
              <Link
                href={s.href}
                tabIndex={n === i ? 0 : -1}
                className="inline-flex h-11 items-center rounded bg-[#ec1c23] px-6 text-sm font-bold text-white transition hover:bg-[#c9151b]"
              >
                {s.cta}
              </Link>
            </div>
          </div>

          <ul className="hidden list-disc space-y-1.5 pl-6 text-[21px] font-light lg:block">
            {s.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      <button
        type="button"
        aria-label="Önceki"
        onClick={() => go(i - 1)}
        className={`${arrow} left-3`}
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        aria-label="Sonraki"
        onClick={() => go(i + 1)}
        className={`${arrow} right-3`}
      >
        <ChevronRight size={22} />
      </button>
      <div className="absolute bottom-3 right-5 flex gap-1.5">
        {slides.map((s, n) => (
          <button
            key={s.title}
            type="button"
            aria-label={`${n + 1}. afiş`}
            aria-current={n === i}
            onClick={() => go(n)}
            className={`size-2 rounded-full transition ${n === i ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
