"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import {
  Sparkles,
  ArrowRight,
  Check,
  Store,
  Shirt,
  Package,
  UtensilsCrossed,
  Wrench,
  Laptop,
  ShoppingBag,
  ScanBarcode,
  Users,
  FileText,
  Menu,
  X,
  ShieldCheck,
  Bot,
  Zap,
  TrendingUp,
  LayoutDashboard,
  Layers,
  Clock,
  ChevronRight,
  Database,
  Calculator,
  Building2,
  Phone,
  Mail,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 overflow-x-hidden w-full max-w-[100vw] antialiased">
      {/* -------------------------------------------------------------
          0. Oturum Açık İse Üst Bilgilendirme Çubuğu
          ------------------------------------------------------------- */}
      {session && (
        <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 text-center flex items-center justify-center gap-2 border-b border-slate-800">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Oturumunuz açık ({session.user?.email}).</span>
          <Link
            href="/panel"
            className="inline-flex items-center gap-1 font-semibold text-white underline hover:text-slate-300 ml-1"
          >
            Yönetim Paneline Git <ArrowRight className="size-3" />
          </Link>
        </div>
      )}

      {/* -------------------------------------------------------------
          1. Header / Navbar
          ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white font-extrabold shadow-sm transition-transform group-hover:scale-105">
              <span className="text-lg tracking-wider">R</span>
            </div>
            <div className="flex flex-col">
              <div className="font-extrabold text-xl tracking-tight text-slate-900">
                Ren <span className="text-slate-500 font-semibold text-sm">Endüstriyel</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 -mt-1 tracking-wider uppercase">
                Ön Muhasebe & POS
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#neden" className="hover:text-slate-950 transition-colors cursor-pointer">
              Özellikler
            </a>
            <a href="#sektorler" className="hover:text-slate-950 transition-colors cursor-pointer">
              Sektörler
            </a>
            <a href="#toptan-perakende" className="hover:text-slate-950 transition-colors cursor-pointer">
              Toptan & Perakende
            </a>
            <a href="#fiyatlar" className="hover:text-slate-950 transition-colors cursor-pointer">
              Fiyatlar
            </a>
          </nav>

          {/* Sağ Eylemler */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {session ? (
              <Link
                href="/panel"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all hover:shadow-md"
              >
                <LayoutDashboard className="size-4" />
                <span>Panele Git</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/giris"
                  className="hidden sm:flex text-sm font-semibold text-slate-700 hover:text-slate-950 px-3 py-2 transition-colors rounded-lg hover:bg-slate-100"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/giris?kayit=1"
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all hover:shadow-md"
                >
                  <span className="sm:hidden">Dene</span>
                  <span className="hidden sm:inline">Ücretsiz Dene</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}

            {/* Mobil Menü Butonu */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Menüyü aç"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobil Menü Çekmecesi */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-3">
            <a
              href="#neden"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Özellikler
            </a>
            <a
              href="#sektorler"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sektörler
            </a>
            <a
              href="#toptan-perakende"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Toptan & Perakende
            </a>
            <a
              href="#fiyatlar"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Fiyatlar
            </a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {session ? (
                <Link
                  href="/panel"
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white"
                >
                  <LayoutDashboard className="size-4" />
                  Yönetim Paneline Git
                </Link>
              ) : (
                <>
                  <Link
                    href="/giris"
                    className="flex items-center justify-center rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/giris?kayit=1"
                    className="flex items-center justify-center rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    7 Gün Ücretsiz Dene
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* -------------------------------------------------------------
          2. Hero Section
          ------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-28 sm:pb-32 flex flex-col items-center text-center">
        {/* Arka plan radyal gradyan */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(148, 163, 184, 0.18) 0%, transparent 65%), linear-gradient(rgb(248, 250, 252) 0%, rgb(255, 255, 255) 100%)",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 flex flex-col items-center">
          {/* Rozet */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-300/80 text-slate-800 text-xs sm:text-sm font-semibold mb-8 shadow-2xs">
            <Sparkles className="size-4 text-slate-600" />
            <span>Esnaf ve KOBİ'ler için özel tasarlandı</span>
          </div>

          {/* Ana Başlık */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            İşinizi tek ekrandan, <br className="hidden sm:block" />
            <span className="text-slate-700 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent">
              kolayca yönetin.
            </span>
          </h1>

          {/* Alt Başlık */}
          <p className="mt-6 text-base sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Karışık muhasebe programlarına ve Excel dosyalarına saatlerinizi harcamayın. Satış yapın, e-fatura kesin ve
            tüm stoklarınızı saniyeler içinde takip edin.
          </p>

          {/* Eylem Butonları */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <Link
              href={session ? "/panel" : "/giris?kayit=1"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 py-3.5 px-8 text-base sm:text-lg font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            >
              <span>{session ? "Panele Giriş Yap" : "7 gün ücretsiz dene"}</span>
              <ArrowRight className="size-5" />
            </Link>

            <Link
              href="/giris"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-slate-300/80 py-3.5 px-8 text-base sm:text-lg font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-all w-full sm:w-auto"
            >
              Demo ile incele
            </Link>
          </div>

          <p className="mt-5 text-xs sm:text-sm text-slate-500 font-medium">
            Kredi kartı gerekmez, anında kurulum.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------
          3. Neden Ren? (Özellikler Grid)
          ------------------------------------------------------------- */}
      <section id="neden" className="scroll-mt-20 py-16 sm:py-24 border-t border-slate-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-3">
              Avantajlar
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Neden Ren?
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Karmaşık ERP değil; günlük işi hızlandıran, anlaşılır ön muhasebe ve perakende platformu.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* 1. Tek Ekranda Ön Muhasebe */}
            <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-900 font-bold border border-slate-300">
                <FileText className="size-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Tek ekranda ön muhasebe</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Cari, stok, kasa, fatura ve raporlar dağınık Excel’lerde değil — aynı güvenli bulut hesabında.
                </p>
              </div>
            </div>

            {/* 2. Hızlı Satış POS Hazır */}
            <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-900 font-bold border border-slate-300">
                <ScanBarcode className="size-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hızlı Satış (POS) hazır</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Barkod, dokunmatik hızlı tuşlar, nakit/kart/veresiye ve fiş basımı: perakende kasası için saniyelik akış.
                </p>
              </div>
            </div>

            {/* 3. Toptan ve Perakende Birlikte */}
            <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-900 font-bold border border-slate-300">
                <Package className="size-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Toptan ve perakende birlikte</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  İkinci fiyat, açık hesap, teklif ve fatura; mağaza ile bayi satışını aynı ürün kartında yönetin.
                </p>
              </div>
            </div>

            {/* 4. Çift Yedekleme & Güvenlik */}
            <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-900 font-bold border border-slate-300">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Çift Yedekleme & Güvenlik</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Verileriniz bağımsız bulut sunucularında eş zamanlı olarak çifte yedeğe alınır. Dilediğiniz an tek tıkla tam Excel/PDF yedek alabilirsiniz.
                </p>
              </div>
            </div>

            {/* 5. REN AI Asistanı */}
            <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs sm:col-span-2 lg:col-span-2">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-bold shadow-xs">
                <Bot className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">REN AI Asistanı</h3>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800">
                    Akıllı Finans
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Doğal dilde soru sorun: cirolar, borçlar, vadesi geçen alacaklar, kritik stoklar ve kâr marjları — REN AI yapay zeka desteği her an yanınızda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          4. Sektörler (Koyu Antrasit / Şık Endüstriyel Zemin)
          ------------------------------------------------------------- */}
      <section id="sektorler" className="scroll-mt-20 py-20 bg-slate-950 text-white border-y border-slate-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
              Her İşletmeye Uygun
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Sektörler
            </h2>
            <p className="mt-2 text-slate-400 text-base leading-relaxed">
              Aynı güçlü çekirdek; sektörünüze göre satış ve stok akışı. Giriş yaptıktan sonra işletme tipinize göre anında kullanmaya başlayabilirsiniz.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Hazır Giyim & Moda */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all group">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-slate-200 group-hover:scale-105 transition-transform">
                <Shirt className="size-6" />
              </div>
              <div className="mt-4 font-bold text-lg text-white">Hazır giyim & moda</div>
              <div className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Mağaza, showroom, çok şubeli perakende, beden ve renk seçenekleri.
              </div>
            </div>

            {/* Market & Bakkal */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all group">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-slate-200 group-hover:scale-105 transition-transform">
                <Store className="size-6" />
              </div>
              <div className="mt-4 font-bold text-lg text-white">Market & bakkal</div>
              <div className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Barkodla saniyelik hızlı kasa, gramajlı ürünler, gün sonu kasa raporu.
              </div>
            </div>

            {/* Toptan / Bayi */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all group">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-slate-200 group-hover:scale-105 transition-transform">
                <Package className="size-6" />
              </div>
              <div className="mt-4 font-bold text-lg text-white">Toptan / bayi</div>
              <div className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Açık hesap, toptan 2. fiyat listesi, teklif, irsaliye ve resmi fatura.
              </div>
            </div>

            {/* Kafe & Hizmet */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all group">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-slate-200 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="size-6" />
              </div>
              <div className="mt-4 font-bold text-lg text-white">Kafe & hizmet</div>
              <div className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Hızlı masraf girişi, tedarikçi cari takibi, basit stok ve nakit kasa.
              </div>
            </div>

            {/* Atölye & Üretim */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all group">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-slate-200 group-hover:scale-105 transition-transform">
                <Wrench className="size-6" />
              </div>
              <div className="mt-4 font-bold text-lg text-white">Atölye & üretim</div>
              <div className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Hammadde, malzeme, işçilik takibi ve kurumsal müşteri cari mutabakatı.
              </div>
            </div>

            {/* E-Ticaret Satıcıları */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all group">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-slate-200 group-hover:scale-105 transition-transform">
                <Laptop className="size-6" />
              </div>
              <div className="mt-4 font-bold text-lg text-white">E-ticaret satıcıları</div>
              <div className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Pazaryeri siparişleri, e-fatura gönderimi ve eş zamanlı stok takibi.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          5. Toptan Satış & Perakende İkili Karşılaştırma
          ------------------------------------------------------------- */}
      <section id="toptan-perakende" className="scroll-mt-20 py-20 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-slate-800 text-xs font-bold uppercase tracking-wider mb-3">
              Çift Kanallı Satış
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Toptan satış & perakende
            </h2>
            <p className="mt-2 text-base text-slate-600 leading-relaxed">
              İkisini ayrı yazılımlarda tutmak zorunda değilsiniz. Ren'de aynı ürün, iki bağımsız fiyat ve iki satış kanalı olarak çalışır.
            </p>
          </div>

          <div className="mt-12 grid lg:grid-cols-2 gap-8">
            {/* Perakende Kartı (Açık Gri / Beyaz Kart) */}
            <article className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-9 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 border border-slate-200 font-bold">
                  <ShoppingBag className="size-6" />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Perakende</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Mağaza / vitrin / kasa</p>
                </div>
              </div>

              <ul className="mt-8 space-y-4 text-sm text-slate-700">
                <li className="flex gap-3">
                  <ScanBarcode className="size-5 shrink-0 text-slate-800 mt-0.5" />
                  <span>
                    <strong>Hızlı Satış (POS):</strong> barkod, hızlı tuşlar, miktar — müşteri beklemeden kasa.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Users className="size-5 shrink-0 text-slate-800 mt-0.5" />
                  <span>
                    <strong>Anonim veya cari:</strong> "Perakende müşteri" ile anında fiş; isterseniz müşteri seçip veresiye.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="size-5 shrink-0 text-slate-800 mt-0.5" />
                  <span>
                    <strong>Ödeme:</strong> nakit, kart, karma, para üstü; gün sonu anlık kasa bakiyesi.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="size-5 shrink-0 text-slate-800 mt-0.5" />
                  <span>
                    <strong>Fiyat:</strong> ürünün perakende satış fiyatı; etiket ve kampanya fiyatı ile uyumlu.
                  </span>
                </li>
              </ul>
            </article>

            {/* Toptan Satış Kartı (Koyu Şık Antrasit Kart) */}
            <article className="rounded-3xl border border-slate-800 bg-slate-900 text-white p-7 sm:p-9 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white font-bold">
                  <Package className="size-6" />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold text-white">Toptan satış</h3>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">Bayi / depo / açık hesap</p>
                </div>
              </div>

              <ul className="mt-8 space-y-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <FileText className="size-5 shrink-0 text-slate-300 mt-0.5" />
                  <span>
                    <strong>Satış & teklif:</strong> satırlı fatura, tekliften dönüşüm, tekrarlayan siparişler.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Users className="size-5 shrink-0 text-slate-300 mt-0.5" />
                  <span>
                    <strong>Cari hesap:</strong> bayi bakiyesi, yaşlandırma, otomatik tahsilat hatırlatması.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="size-5 shrink-0 text-slate-300 mt-0.5" />
                  <span>
                    <strong>2. fiyat (toptan):</strong> ürün kartında ayrı toptan fiyat; faturada otomatik uygulama.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="size-5 shrink-0 text-slate-300 mt-0.5" />
                  <span>
                    <strong>Çek / senet & vade:</strong> toptan ödemelerde senetli ve vadeli tahsilat takibi.
                  </span>
                </li>
              </ul>
            </article>
          </div>

          {/* Pratik Fark Bilgi Kutusu */}
          <div className="mt-8 rounded-2xl border border-slate-300/80 bg-white p-5 sm:p-6 text-sm text-slate-800 leading-relaxed shadow-2xs">
            <strong>Pratik fark:</strong> Perakende = anlık kasa ve fiş. Toptan = cari, vade ve resmi belge. İki kanalda da aynı stok düşer; raporlarda toptan ve perakende satışlarınızı tek tıkla ayrıştırabilirsiniz.
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          6. Fiyatlandırma & Planlar
          ------------------------------------------------------------- */}
      <section id="fiyatlar" className="scroll-mt-20 py-24 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-3">
              Şeffaf Ücretlendirme
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Esnek ve Şeffaf Fiyatlandırma
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              İhtiyacınıza en uygun planı seçin. Gizli maliyetler yok, taahhüt yok, istediğiniz zaman iptal edin.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-10 max-w-4xl mx-auto items-stretch">
            {/* 1. Profesyonel Plan */}
            <div className="bg-slate-50/60 rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">Profesyonel</h3>
                    <p className="text-sm text-slate-500 mt-1">Büyüyen KOBİ ve ekipler için</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider">
                    Önerilen
                  </span>
                </div>

                <p className="mt-5 text-xs font-semibold text-slate-700 bg-slate-200/60 p-3.5 rounded-xl border border-slate-300/50">
                  💡 <strong>Günlük sadece bir bardak çay fiyatına</strong> (~₺20/gün) ön muhasebenizi güvenle buluta taşıyın.
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₺599</span>
                  <span className="text-sm text-slate-500 font-medium">/ ay</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Yıllık abonelikte aylık ₺509 (%15 indirimli)
                </p>

                <div className="border-t border-slate-200 my-6" />

                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                  Planda Neler Var?
                </h4>
                <ul className="space-y-3.5 text-sm text-slate-700">
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-900 shrink-0 mt-0.5" />
                    <span><strong>5 kullanıcı</strong> erişim yetkilendirmesi</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>e-Fatura / e-Arşiv entegrasyonu (GİB uyumlu)</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Müşteri & Tedarikçi Cari hesap takibi ve ekstre</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Barkodlu Hızlı Satış (POS) ekranı</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Detaylı Stok & Depo yönetimi, sayım ve transfer</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Tekrarlayan faturalar (Otomatik faturalama)</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Çoklu para birimi (Dövizli işlemler) + Canlı TCMB kuru</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Banka ekstresi içe aktarma & mutabakat (CSV/Excel)</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/giris?kayit=1&plan=Profesyonel"
                  className="w-full flex items-center justify-center py-3.5 rounded-2xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm hover:shadow-md"
                >
                  Profesyonel Planı Başlat
                </Link>
              </div>
            </div>

            {/* 2. Kurumsal Plan (REN AI) */}
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-8 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow text-white">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-extrabold text-white">Kurumsal</h3>
                    <p className="text-sm text-slate-400 mt-1">Tam ölçekli operasyonlar & REN AI</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Bot className="size-3.5" /> REN AI
                  </span>
                </div>

                <p className="mt-5 text-xs font-semibold text-slate-300 bg-white/5 p-3.5 rounded-xl border border-white/10">
                  ☕ <strong>Günlük bir fincan kahve bedeline</strong> (~₺33/gün) işletmenizin tüm kanallarını REN AI yapay zeka ile uçtan uca yönetin.
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₺999</span>
                  <span className="text-sm text-slate-400 font-medium">/ ay</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Yıllık abonelikte aylık ₺849 (%15 indirimli)
                </p>

                <div className="border-t border-slate-800 my-6" />

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Planda Neler Var?
                </h4>
                <ul className="space-y-3.5 text-sm text-slate-300">
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-200 shrink-0 mt-0.5" />
                    <span><strong>25 kullanıcı</strong> erişim limiti ve rol yönetimi</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-200 shrink-0 mt-0.5" />
                    <span><strong>REN AI Yapay Zeka</strong> Finans & Muhasebe Asistanı</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-200 shrink-0 mt-0.5" />
                    <span>Profesyonel planındaki tüm özellikler dahil</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-200 shrink-0 mt-0.5" />
                    <span>Gelişmiş analitik büyüme & sağlık skorbordu</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-200 shrink-0 mt-0.5" />
                    <span>Toplu cari, stok ve fatura işlemleri</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-200 shrink-0 mt-0.5" />
                    <span>Öncelikli teknik destek & 7/24 hızlı yanıt garantisi</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check className="size-4 text-slate-200 shrink-0 mt-0.5" />
                    <span>İşletmenize özel atanmış kurumsal müşteri temsilcisi</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/giris?kayit=1&plan=Kurumsal"
                  className="w-full flex items-center justify-center py-3.5 rounded-2xl font-bold text-sm bg-white text-slate-900 hover:bg-slate-100 transition shadow-lg"
                >
                  Kurumsal Planı Başlat
                </Link>
              </div>
            </div>
          </div>

          {/* Alt Çağrı */}
          <div className="text-center mt-16 space-y-3">
            <Link
              href={session ? "/panel" : "/giris?kayit=1"}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-2xl transition shadow-lg shadow-slate-900/10"
            >
              <span>7 Gün Ücretsiz Deneyin</span>
              <ArrowRight className="size-5" />
            </Link>
            <p className="text-sm text-slate-500 font-medium">
              Kredi kartı gerekmez. Anında hesabınızı oluşturun.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          7. Footer
          ------------------------------------------------------------- */}
      <footer className="pt-16 pb-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 text-sm text-slate-600 mb-12">
            {/* Marka & Slogan */}
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white font-extrabold text-base">
                  R
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-extrabold text-xl text-slate-900">Ren Endüstriyel</span>
                  <span className="text-[11px] text-slate-400 font-semibold">Ön Muhasebe & ERP</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed mt-2 text-slate-600 max-w-sm">
                Esnaf ve KOBİ'ler için geliştirilmiş, REN AI destekli modern ön muhasebe ve hızlı satış (POS) platformu.
              </p>
            </div>

            {/* Çözümler */}
            <div className="flex flex-col gap-2.5">
              <h3 className="font-bold text-xs tracking-wider text-slate-400 uppercase mb-2">
                Çözümler
              </h3>
              <span className="hover:text-slate-900 transition-colors cursor-pointer">Hızlı Satış (POS)</span>
              <span className="hover:text-slate-900 transition-colors cursor-pointer">Ön Muhasebe</span>
              <span className="hover:text-slate-900 transition-colors cursor-pointer">Stok & Depo</span>
              <span className="hover:text-slate-900 transition-colors cursor-pointer">Cari Hesaplar</span>
              <span className="hover:text-slate-900 transition-colors cursor-pointer">Toptan Satış</span>
              <span className="hover:text-slate-900 transition-colors cursor-pointer">E-Fatura & E-Arşiv</span>
            </div>

            {/* Özellikler */}
            <div className="flex flex-col gap-2.5">
              <h3 className="font-bold text-xs tracking-wider text-slate-400 uppercase mb-2">
                Sistem
              </h3>
              <a href="#neden" className="hover:text-slate-900 transition-colors">Avantajlar</a>
              <a href="#sektorler" className="hover:text-slate-900 transition-colors">Sektörler</a>
              <a href="#fiyatlar" className="hover:text-slate-900 transition-colors">Fiyatlandırma</a>
              <Link href="/giris" className="hover:text-slate-900 transition-colors">Kullanıcı Girişi</Link>
              <Link href="/panel" className="hover:text-slate-900 transition-colors">Yönetim Paneli</Link>
            </div>

            {/* İletişim */}
            <div className="flex flex-col gap-2.5">
              <h3 className="font-bold text-xs tracking-wider text-slate-400 uppercase mb-2">
                İletişim & Destek
              </h3>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="size-4 shrink-0 text-slate-400" />
                <span>destek@renendustriyel.com</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="size-4 shrink-0 text-slate-400" />
                <span>Ren Endüstriyel Çözümleri</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 leading-relaxed">
                Bulut tabanlı ön muhasebe ve hızlı perakende sistemi.
              </div>
            </div>
          </div>

          {/* Alt Telif */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-8 text-xs text-slate-500">
            <p>© 2026 Ren Endüstriyel · Tüm hakları saklıdır.</p>
            <div className="flex items-center gap-2 text-slate-600 font-semibold">
              <Bot className="size-4 text-slate-900" />
              <span>powered by <strong className="text-slate-950 font-black">REN AI</strong></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
