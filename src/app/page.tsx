"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import {
  Sparkles,
  ArrowRight,
  Check,
  ShoppingBag,
  ScanBarcode,
  Users,
  Package,
  FileText,
  Menu,
  X,
  Store,
  Shirt,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";

// Feature list (Vs in Pusulam)
const features = [
  {
    title: "Tek ekranda ön muhasebe",
    desc: "Cari, stok, kasa, fatura ve raporlar dağınık Excel'lerde değil — aynı bulut hesabında.",
  },
  {
    title: "Hızlı Satış (POS) hazır",
    desc: "Barkod, hızlı tuşlar, nakit/kart/veresiye ve fiş: perakende kasası için saniyelik akış.",
  },
  {
    title: "Toptan ve perakende birlikte",
    desc: "İkinci fiyat, açık hesap, teklif ve fatura; mağaza ile bayi satışını aynı ürün kartında yönetin.",
  },
  {
    title: "Çift Yedekleme & Manuel E-posta Yedeği",
    desc: "Verileriniz farklı coğrafi bölgelerdeki 2 bağımsız bulut sunucusunda eş zamanlı olarak çifte yedeğe alınır. Dilediğiniz an e-postanıza manuel yedek isteyebilirsiniz.",
  },
  {
    title: "REN AI asistanı",
    desc: "Doğal dilde soru sorun: cirolar, borçlar, stok — Kurumsal planda yapay zeka desteği.",
  },
];

// Sector list (Fs in Pusulam)
const sectors = [
  {
    icon: Shirt,
    title: "Hazır giyim & moda",
    desc: "Mağaza, showroom, çok şubeli perakende.",
  },
  {
    icon: Store,
    title: "Market & bakkal",
    desc: "Barkod, hızlı kasa, gün sonu kasa raporu.",
  },
  {
    icon: Package,
    title: "Toptan / bayi",
    desc: "Açık hesap, toptan fiyat, teklif & fatura.",
  },
  {
    icon: UtensilsCrossed,
    title: "Kafe & hizmet",
    desc: "Masraf, cari, basit stok ve kasa.",
  },
  {
    icon: Wrench,
    title: "Atölye & üretim",
    desc: "Malzeme, işçilik, müşteri cari takibi.",
  },
  {
    icon: ShoppingBag,
    title: "E-ticaret satıcıları",
    desc: "Pazaryeri siparişleri ve stok eşlemesi.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const scrollToSection = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY - 72,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-800 overflow-x-hidden w-full max-w-[100vw]">
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
      <header className="sticky top-0 z-40 border-b border-slate-200/50 bg-[#f6f8f7]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-lg shadow-sm">
              R
            </div>
            <div className="font-extrabold text-xl tracking-tight text-slate-900">
              Ren Endüstriyel
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {[
              { id: "neden", label: "Özellikler" },
              { id: "sektorler", label: "Sektörler" },
              { id: "fiyatlar", label: "Fiyatlar" },
            ].map((r) => (
              <a
                key={r.id}
                href={`#${r.id}`}
                onClick={(e) => scrollToSection(r.id, e)}
                className="hover:text-slate-950 transition-colors cursor-pointer"
              >
                {r.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href="/giris"
              className="hidden sm:flex text-sm font-medium text-slate-600 hover:text-slate-950 px-2 transition-colors"
            >
              Giriş Yap
            </Link>
            <Link
              href="/giris?kayit=1"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap !rounded-full !py-2.5 !px-5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <span className="sm:hidden">Dene</span>
              <span className="hidden sm:inline">Ücretsiz Dene</span>
            </Link>
            <button
              type="button"
              className="md:hidden p-2.5 rounded-full text-slate-600 hover:bg-slate-200/50 transition-colors"
              aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/50 bg-[#f6f8f7] px-4 py-4 space-y-2 animate-fade-in shadow-lg">
            {[
              ["#neden", "Özellikler", "neden"],
              ["#sektorler", "Sektörler", "sektorler"],
              ["#fiyatlar", "Fiyatlar", "fiyatlar"],
            ].map(([href, label, id]) => (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollToSection(id, e)}
                className="block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-950 transition-colors"
              >
                {label}
              </a>
            ))}
            <Link
              href="/giris"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-950 transition-colors"
            >
              Giriş Yap
            </Link>
          </div>
        )}
      </header>

      {/* -------------------------------------------------------------
          2. Hero Section
          ------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-32 sm:pb-36 flex flex-col items-center text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(100,116,139,0.12) 0%, transparent 60%), linear-gradient(180deg, #f6f8f7 0%, #ffffff 100%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-200/70 border border-slate-300 text-slate-800 text-sm font-medium mb-8">
            <Sparkles size={16} className="text-slate-700" />
            <span>Esnaf ve KOBİ'ler için özel tasarlandı</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            İşinizi tek ekrandan, <br className="hidden sm:block" />
            <span className="text-slate-900 underline decoration-slate-300 decoration-wavy underline-offset-8">
              kolayca yönetin.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Karışık muhasebe programlarına ve Excel dosyalarına saatlerinizi
            harcamayın. Satış yapın, e-fatura kesin ve tüm stoklarınızı
            saniyeler içinde takip edin.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link
              href="/giris?kayit=1"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap !rounded-full !py-3.5 !px-8 text-base sm:text-lg font-semibold w-full sm:w-auto justify-center bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all"
            >
              7 gün ücretsiz dene <ArrowRight size={20} className="ml-2" />
            </Link>
            <Link
              href="/giris"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap !rounded-full !py-3.5 !px-8 text-base sm:text-lg font-semibold w-full sm:w-auto justify-center bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700"
            >
              Demo ile incele
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-500 font-medium">
            Kredi kartı gerekmez, anında kurulum.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------
          3. Section #neden (Özellikler)
          ------------------------------------------------------------- */}
      <section
        id="neden"
        className="scroll-mt-20 py-16 sm:py-20 border-t border-slate-200/60"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Neden Ren Endüstriyel?
          </h2>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Karmaşık ERP değil; günlük işi hızlandıran, anlaşılır ön muhasebe.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((r) => (
              <div
                key={r.title}
                className="flex gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition"
              >
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{r.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    {r.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          4. Section #sektorler
          ------------------------------------------------------------- */}
      <section
        id="sektorler"
        className="scroll-mt-20 py-16 sm:py-20 bg-slate-900 text-white"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Sektörler
          </h2>
          <p className="mt-2 text-slate-300 max-w-2xl">
            Aynı çekirdek; sektörünüze göre satış ve stok akışı. Girişten sonra
            işletme tipinizi seçebilirsiniz.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.title}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 hover:bg-white/10 transition"
                >
                  <Icon size={22} className="text-slate-300" />
                  <div className="mt-3 font-bold">{r.title}</div>
                  <div className="mt-1 text-sm text-slate-300/70">{r.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          5. Section #toptan-perakende
          ------------------------------------------------------------- */}
      <section id="toptan-perakende" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Toptan satış & perakende
          </h2>
          <p className="mt-2 text-slate-600 max-w-2xl">
            İkisini ayrı yazılımlarda tutmak zorunda değilsiniz. Ren
            Endüstriyel’de aynı ürün, iki fiyat ve iki satış kanalı olarak
            çalışır.
          </p>

          <div className="mt-10 grid lg:grid-cols-2 gap-6">
            {/* Perakende Kartı */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                  <ShoppingBag size={22} />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Perakende
                  </h3>
                  <p className="text-sm text-slate-500">Mağaza / vitrin / kasa</p>
                </div>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-2">
                  <ScanBarcode
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-700"
                  />
                  <span>
                    <strong>Hızlı Satış (POS):</strong> barkod, hızlı tuşlar,
                    miktar — müşteri beklemeden kasa.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Users size={16} className="mt-0.5 shrink-0 text-slate-700" />
                  <span>
                    <strong>Anonim veya cari:</strong> “Perakende müşteri” ile
                    fiş; isterseniz müşteri seçip veresiye.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-slate-700" />
                  <span>
                    <strong>Ödeme:</strong> nakit, kart, karma, para üstü; gün
                    sonu kasa bakiyesi.
                  </span>
                </li>
              </ul>
            </article>

            {/* Toptan Satış Kartı */}
            <article className="rounded-2xl border border-slate-800 bg-slate-900 text-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-slate-300">
                  <Package size={22} />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold">Toptan satış</h3>
                  <p className="text-sm text-white/55">
                    Bayi / depo / açık hesap
                  </p>
                </div>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-white/85">
                <li className="flex gap-2">
                  <FileText
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-300"
                  />
                  <span>
                    <strong>Satış & teklif:</strong> satırlı fatura, tekliften
                    dönüşüm, tekrarlayan sipariş.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Users size={16} className="mt-0.5 shrink-0 text-slate-300" />
                  <span>
                    <strong>Cari hesap:</strong> bayi bakiyesi, yaşlandırma,
                    tahsilat hatırlatması.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-slate-300" />
                  <span>
                    <strong>2. fiyat (toptan):</strong> ürün kartında ayrı
                    toptan fiyat; ayardan varsayılan uygulanabilir.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-slate-300" />
                  <span>
                    <strong>Çek / senet & vade:</strong> toptan ödemelerde
                    senetli tahsilat takibi.
                  </span>
                </li>
              </ul>
            </article>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-100/90 px-5 py-5 sm:px-6 text-sm text-slate-900 leading-relaxed">
            <strong>Pratik fark:</strong> Perakende = anlık kasa ve fiş. Toptan
            = cari, vade ve belge. Aynı stok düşer; raporlarda kanalı
            ayırabilirsiniz. Demo hesabında hem POS hem toptan bayi cari
            örnekleri hazır.
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          6. Section #fiyatlar
          ------------------------------------------------------------- */}
      <section
        id="fiyatlar"
        className="scroll-mt-20 py-20 bg-slate-50/60 border-y border-slate-200/80"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Esnek ve Şeffaf Fiyatlandırma
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              İhtiyacınıza en uygun planı seçin. Gizli maliyetler yok,
              istediğiniz zaman iptal edin.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto items-stretch">
            {/* Profesyonel Plan */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      Profesyonel
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Büyüyen KOBİ ve ekipler için
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    KOBİ Planı
                  </span>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₺599</span>
                  <span className="text-sm text-slate-500 font-medium">/ ay</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Yıllık abonelikte aylık ₺509 (%15 indirimli)
                </p>

                <div className="border-t border-slate-100 my-6" />

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Planda Neler Var?
                </h4>
                <ul className="space-y-3.5 text-sm text-slate-600">
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-800 shrink-0 mt-0.5" />
                    <span>
                      <strong>5 kullanıcı</strong> erişim limiti
                    </span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-800 shrink-0 mt-0.5" />
                    <span>e-Fatura / e-Arşiv entegrasyonu (API)</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-800 shrink-0 mt-0.5" />
                    <span>Müşteri & Tedarikçi Cari hesap takibi</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-800 shrink-0 mt-0.5" />
                    <span>Barkodlu Hızlı Satış (POS) ekranı</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-800 shrink-0 mt-0.5" />
                    <span>Detaylı Stok & Depo yönetimi</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-800 shrink-0 mt-0.5" />
                    <span>Tekrarlayan faturalar (Otomatik faturalama)</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-800 shrink-0 mt-0.5" />
                    <span>
                      Çoklu para birimi (Dövizli işlemler) + Canlı kur
                    </span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-800 shrink-0 mt-0.5" />
                    <span>Banka ekstresi içe aktarma & mutabakat (CSV)</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/giris?kayit=1&plan=Profesyonel"
                  className="w-full flex justify-center py-3.5 rounded-2xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition shadow-lg shadow-slate-900/10"
                >
                  Profesyonel Planı Başlat
                </Link>
              </div>
            </div>

            {/* Kurumsal (REN AI) Plan */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow text-white">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-extrabold text-white">
                        Kurumsal
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        <Sparkles size={12} className="text-slate-300" />
                        REN AI
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Gelişmiş işletmeler & yapay zeka
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-white border border-slate-700">
                    ÖNERİLEN
                  </span>
                </div>

                <p className="mt-4 text-xs text-slate-300 leading-relaxed bg-white/5 border border-white/10 rounded-xl p-3">
                  <strong>Günlük bir fincan kahve bedeline</strong> (~₺33/gün)
                  işletmenizin tüm kanallarını yapay zeka ile uçtan uca yönetin.
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₺999</span>
                  <span className="text-sm text-slate-400 font-medium">/ ay</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Yıllık abonelikte aylık ₺849 (%15 indirimli)
                </p>

                <div className="border-t border-slate-800 my-6" />

                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                  Planda Neler Var?
                </h4>
                <ul className="space-y-3.5 text-sm text-slate-300">
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-300 shrink-0 mt-0.5" />
                    <span>
                      <strong>25 kullanıcı</strong> erişim limiti
                    </span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-300 shrink-0 mt-0.5" />
                    <span>
                      <strong>REN AI Yapay Zeka</strong> Finans & Muhasebe
                      Asistanı
                    </span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-300 shrink-0 mt-0.5" />
                    <span>Profesyonel planındaki tüm özellikler dahil</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-300 shrink-0 mt-0.5" />
                    <span>
                      Gelişmiş analitik raporlar & kârlılık grafikleri
                    </span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-300 shrink-0 mt-0.5" />
                    <span>Toplu cari, stok ve fatura işlemleri</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-300 shrink-0 mt-0.5" />
                    <span>Öncelikli teknik destek & hızlı yanıt garantisi</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <Check size={16} className="text-slate-300 shrink-0 mt-0.5" />
                    <span>İşletmenize özel atanmış müşteri temsilcisi</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/giris?kayit=1&plan=Kurumsal"
                  className="w-full flex justify-center py-3.5 rounded-2xl font-bold text-sm bg-white text-slate-900 hover:bg-slate-100 transition shadow-lg"
                >
                  Kurumsal Planı Başlat
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center mt-16 space-y-3">
            <p className="text-sm text-slate-500">
              Tüm planlarımız 7 gün koşulsuz ücretsiz deneme ile başlar.
              Beğenmezseniz hiçbir ücret ödemezsiniz.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          7. Footer
          ------------------------------------------------------------- */}
      <footer className="border-t border-slate-200/80 bg-white pt-16 pb-12 text-sm text-slate-600">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12">
            {/* Sütun 1: Logo & Hakkında */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xl shadow-sm">
                  R
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-extrabold text-lg text-slate-900">
                    Ren Endüstriyel
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ön Muhasebe & POS Platformu
                  </span>
                </div>
              </Link>
              <p className="text-xs text-slate-500 leading-relaxed">
                Modern, hızlı ve bulut tabanlı ön muhasebe ve satış yönetim
                platformu.
              </p>

              {/* Sosyal Medya İkonları */}
              <div className="flex items-center gap-2 mt-2">
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  aria-label="Instagram"
                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  aria-label="Facebook"
                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a
                  href="https://www.youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube"
                  aria-label="YouTube"
                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/></svg>
                </a>
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="LinkedIn"
                  aria-label="LinkedIn"
                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                </a>
              </div>
            </div>

            {/* Sütun 2: Ürün */}
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-xs tracking-wider text-slate-400 uppercase mb-2">
                Ürün
              </h3>
              <a
                href="#neden"
                onClick={(e) => scrollToSection("neden", e)}
                className="hover:text-slate-900 transition-colors"
              >
                Özellikler
              </a>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">
                Blog
              </Link>
              <Link
                href="/biz-kimiz"
                className="hover:text-slate-900 transition-colors"
              >
                Biz Kimiz
              </Link>
              <Link
                href="/tanitim"
                className="hover:text-slate-900 transition-colors"
              >
                Tanıtım
              </Link>
              <Link
                href="/marka-kimligi"
                className="hover:text-slate-900 transition-colors"
              >
                Marka Kimliği
              </Link>
              <Link
                href="/yardim"
                className="hover:text-slate-900 transition-colors"
              >
                Yardım Merkezi
              </Link>
            </div>

            {/* Sütun 3: Çözümler */}
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-xs tracking-wider text-slate-400 uppercase mb-2">
                Çözümler
              </h3>
              <Link
                href="/hizli-satis-programi"
                className="hover:text-slate-900 transition-colors"
              >
                Hızlı Satış
              </Link>
              <Link
                href="/on-muhasebe-programi"
                className="hover:text-slate-900 transition-colors"
              >
                Ön Muhasebe
              </Link>
              <Link
                href="/stok-takip-programi"
                className="hover:text-slate-900 transition-colors"
              >
                Stok Takip
              </Link>
              <Link
                href="/cari-hesap-programi"
                className="hover:text-slate-900 transition-colors"
              >
                Cari Hesap
              </Link>
              <Link
                href="/market-programi"
                className="hover:text-slate-900 transition-colors"
              >
                Market
              </Link>
              <Link
                href="/toptan-satis-programi"
                className="hover:text-slate-900 transition-colors"
              >
                Toptan Satış
              </Link>
            </div>

            {/* Sütun 4: İletişim */}
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-xs tracking-wider text-slate-400 uppercase mb-2">
                İletişim
              </h3>
              <a
                href="mailto:destek@renendustriyel.com"
                className="hover:text-slate-900 transition-colors inline-flex items-center gap-2"
              >
                <span>✉</span> destek@renendustriyel.com
              </a>
              <a
                href="tel:+902163115358"
                className="hover:text-slate-900 transition-colors inline-flex items-center gap-2"
              >
                <span>☎</span> 0216 311 53 58
              </a>
              <a
                href="https://wa.me/905421013822"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900 transition-colors"
              >
                WhatsApp +90 542 101 38 22
              </a>
              <div className="text-[11px] leading-relaxed mt-2 text-slate-400">
                Ren Endüstriyel Bilişim ve Otomasyon
                <br />
                İstanbul / Türkiye
              </div>
            </div>
          </div>

          {/* Alt Telif & Powered By */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6 pb-6 text-xs text-slate-400 text-center sm:text-left">
            <p>
              © {new Date().getFullYear()} Ren Endüstriyel — Tüm hakları
              saklıdır.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-500">
              <span className="text-slate-400">powered by</span>
              <span className="font-bold text-slate-700">REN AI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
