"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { BrandMark } from "@/components/layout/brand";
import {
  Droplets,
  Factory,
  Home,
  Wrench,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  FileText,
  ShieldCheck,
  Layers,
  Award,
  Zap,
  Menu,
  X,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";

// Ürün Kategorileri
type ProductCategory = "all" | "endustriyel" | "evsel" | "sarf" | "dozaj";

interface ProductItem {
  id: string;
  category: "endustriyel" | "evsel" | "sarf" | "dozaj";
  categoryLabel: string;
  title: string;
  specs: string[];
  capacity: string;
  badge?: string;
  desc: string;
  image: string;
}

const PRODUCTS: ProductItem[] = [
  // 1. Endüstriyel Ürünler
  {
    id: "end-ro-1",
    category: "endustriyel",
    categoryLabel: "Endüstriyel Su Arıtma",
    title: "Endüstriyel Ters Ozmoz (RO) Ünitesi",
    specs: ["Grundfos Yüksek Basınç Pompası", "8040 / 4040 Membran Grubu", "Paslanmaz Çelik Şase (AISI 304/316)", "PLC Dokunmatik Otomasyon Paneli"],
    capacity: "1 m³/h - 50 m³/h Kapasite",
    badge: "Çok Satan",
    desc: "Yüksek tuzluluk ve iletkenlik oranına sahip kuyu, şebeke ve deniz sularını yüksek saflıkta proses ve içme suyuna dönüştürür.",
    image: "/images/industrial-ro-system.jpg",
  },
  {
    id: "end-soft-1",
    category: "endustriyel",
    categoryLabel: "Endüstriyel Su Arıtma",
    title: "Tam Otomatik Tandem Su Yumuşatma Sistemi",
    specs: ["Fleck / Clack Otomatik Kontrol Valfi", "Yüksek Kapasiteli Katyonik Reçine", "Tuz Eriyik Tankı & Seviye Flatörü", "Kesintisiz 24 Saat Rejenerasyon"],
    capacity: "2 m³/h - 80 m³/h Debili",
    badge: "Kireç Koruması",
    desc: "Buhar kazanları, soğutma kuleleri ve sanayi makinelerini kireç taşı oluşumuna karşı korur, enerji sarfiyatını minimize eder.",
    image: "/images/industrial-ro-system.jpg",
  },
  {
    id: "end-filter-1",
    category: "endustriyel",
    categoryLabel: "Endüstriyel Su Arıtma",
    title: "Multimedya Kum & Aktif Karbon Filtrasyon Tankı",
    specs: ["Kademeli Kuars Kum & Antrasit Yatak", "Yüksek İyotlu Aktif Karbon Dolgusu", "Zaman veya Debi Kontrollü Ters Yıkama", "FRP Korozyonsuz Basınç Tankı"],
    capacity: "3 m³/h - 60 m³/h",
    badge: "Ön Filtrasyon",
    desc: "Sudaki askıda katı maddeleri, bulanıklığı, pası, kötü koku ve kloru arıtarak ana arıtma ünitelerinin ömrünü uzatır.",
    image: "/images/industrial-ro-system.jpg",
  },
  {
    id: "end-cont-1",
    category: "endustriyel",
    categoryLabel: "Endüstriyel Su Arıtma",
    title: "Konteynerize Mobil Su Arıtma İstasyonu",
    specs: ["20' / 40' Yalıtımlı Deniz Konteyneri", "Dahili İklimlendirme & Aydınlatma", "Tak-Çalıştır Hızlı Saha Montajı", "Uzaktan SCADA / GSM İzleme"],
    capacity: "Günde 50 - 1.000 Ton",
    badge: "Anahtar Teslim",
    desc: "Şantiye, maden sahaları, afet bölgeleri ve kıyı tesisleri için hızlı devreye alınabilen mobil arıtma çözümü.",
    image: "/images/industrial-ro-system.jpg",
  },

  // 2. Evsel ve Ofis Ürünleri
  {
    id: "evs-ro-1",
    category: "evsel",
    categoryLabel: "Evsel & Ofis Sistemleri",
    title: "Tezgah Altı 6 Kademeli Kapalı Kasa RO Cihazı",
    specs: ["NSF Onaylı Orijinal Membran", "Alkali & Mineral Zenginleştirme", "Dahili Sessiz Takviye Pompası", "3.2 Galon Çelik Basınç Tankı"],
    capacity: "Günde 280 Litre Kapasite",
    badge: "Premium Ev Tipi",
    desc: "Musluk suyunu ağır metal, klor, kireç ve bakterilerden arındırarak 8.5 pH değerinde mineralce zengin alkali içme suyu sunar.",
    image: "/images/residential-purifier.jpg",
  },
  {
    id: "evs-bina-1",
    category: "evsel",
    categoryLabel: "Evsel & Ofis Sistemleri",
    title: "Bina & Daire Girişi Kireç ve Tortu Önleyici Sistem",
    specs: ["Yıkanabilir Paslanmaz Çelik Ön Filtre", "Silifoz / Manyetik Kireç Çözücü", "Big Blue 20\" Tortu & Karbon Kovanları", "Sıfır Basınç Düşüşü"],
    capacity: "Tüm Ev & Bina Girişleri",
    badge: "Tesisat Koruma",
    desc: "Kombileri, boylerleri, çamaşır ve bulaşık makinelerini ve su tesisatını tortu, çamur ve kireç tıkanmalarına karşı %100 korur.",
    image: "/images/residential-purifier.jpg",
  },
  {
    id: "evs-sebil-1",
    category: "evsel",
    categoryLabel: "Evsel & Ofis Sistemleri",
    title: "Ofis Tipi Doğrudan Akışlı Arıtmalı Su Sebili",
    specs: ["Sıcak / Soğuk / Oda Sıcaklığı 3 Musluk", "Paslanmaz Çelik Hijyenik İç Depo", "Dokunmatik LED Gösterge & Çocuk Kilidi", "Damacana Değiştirme Derdine Son"],
    capacity: "20-50 Kişilik Ofisler",
    badge: "Ofis & Kurumsal",
    desc: "Şirketler, okullar, klinikler ve iş yerleri için sınırsız, ekonomik ve hijyenik arıtılmış içme suyu konforu.",
    image: "/images/residential-purifier.jpg",
  },
  {
    id: "evs-uv-1",
    category: "evsel",
    categoryLabel: "Evsel & Ofis Sistemleri",
    title: "Ultraviyole (UV) Su Dezenfeksiyon Cihazı",
    specs: ["Philips / Sterilight UV Lamba", "Paslanmaz Çelik Reaktör Gövdesi", "Görsel ve Sesli Arıza Alarmı", "%99.99 Bakteri & Virüs Yok Etme"],
    capacity: "1 - 15 GPM Debili",
    badge: "Kimyasalsız Hijyen",
    desc: "Suyun tadını ve kimyasal yapısını değiştirmeden, kimyasal madde kullanmaksızın mikrobiyolojik dezenfeksiyon sağlar.",
    image: "/images/residential-purifier.jpg",
  },

  // 3. Sarf Malzeme & Yedek Parça
  {
    id: "srf-membran-1",
    category: "sarf",
    categoryLabel: "Sarf & Yedek Parça",
    title: "Orijinal RO Membranları (Dow Filmtec / Toray)",
    specs: ["8040 Endüstriyel Yüksek Debi Serisi", "4040 Ticari Ters Ozmoz Membranı", "1812 Evsel 75/100 GPD Membran", "%99.5 Yüksek Tuz Giderim Oranı"],
    capacity: "Orijinal İthalat",
    badge: "Orijinal Garanti",
    desc: "Dünyanın lider membran üreticilerinin en yüksek verimlilik ve kimyasal dayanıklılığa sahip orijinal membran modelleri.",
    image: "/images/filtration-membranes.jpg",
  },
  {
    id: "srf-recine-1",
    category: "sarf",
    categoryLabel: "Sarf & Yedek Parça",
    title: "Katyonik Su Yumuşatma Reçinesi & Tuz",
    specs: ["Güçlü Asidik Jel Tipi Katyonik Reçine", "İçme Suyu Uygunluk & NSF Sertifikası", "Yüksek Değişim Kapasitesi (eq/L)", "Rafine Tablet Tuz 25 kg Çuval"],
    capacity: "25 Litrelik Torbalar",
    badge: "Yüksek Kapasite",
    desc: "Yumuşatma sistemleri için uzun ömürlü, aşınmaya ve kimyasal dezenfektanlara dirençli yüksek saflıkta reçineler.",
    image: "/images/filtration-membranes.jpg",
  },
  {
    id: "srf-kartus-1",
    category: "sarf",
    categoryLabel: "Sarf & Yedek Parça",
    title: "Sediment, Spun & Blok Karbon Kartuş Filtreler",
    specs: ["1, 5, 10, 20 Mikron Hassasiyet", "10\" ve 20\" Standart & Big Blue Boyut", "Hindistan Cevizi Kabuğu Karbon (CTO)", "Yıkanabilir Pileli Kartuş Seçenekleri"],
    capacity: "Tüm Standart Kovanlara Uyumlu",
    badge: "Geniş Stok",
    desc: "Fiziksel tortu, pas ve klor tutma işlemlerinde yüksek partikül tutma kapasitesine sahip sarf filtre kartuşları.",
    image: "/images/filtration-membranes.jpg",
  },

  // 4. Dozaj & Otomasyon
  {
    id: "doz-pompa-1",
    category: "dozaj",
    categoryLabel: "Dozaj & Otomasyon",
    title: "Dijital Dozaj Pompaları & Antiskalant Sistemleri",
    specs: ["Mikroişlemci Kontrollü Solenoid Sürücü", "Antiskalant, Klor ve Asit Dozajı", "Debimetre & Seviye Probu Girişleri", "Ters Ozmoz Membran Koruma"],
    capacity: "1 - 20 L/h Ayarlanabilir",
    badge: "Proses Güvenliği",
    desc: "Membran yüzeyinde kireç ve silikat tortularını önleyen antiskalant kimyasalları ve hassas dijital dozaj pompaları.",
    image: "/images/filtration-membranes.jpg",
  },
];

// Uygulama Alanları
const APPLICATION_AREAS = [
  {
    title: "Fabrika & Ağır Sanayi",
    desc: "Kazan besleme suyu, soğutma kuleleri, proses suyu arıtımı ve kapalı devre sistem koruması.",
    icon: Factory,
  },
  {
    title: "Müstakil Villa & Konut Siteleri",
    desc: "Kireçsiz banyolar, lekesiz camlar, tesisat koruması ve musluktan kesintisiz alkali içme suyu.",
    icon: Home,
  },
  {
    title: "Otel & Turizm Tesisleri",
    desc: "Yüksek debili içme suyu, çamaşırhane yumuşatma, havuz filtrasyonu ve mutfak ekipmanı koruma.",
    icon: Droplets,
  },
  {
    title: "Gıda, İçecek & İlaç",
    desc: "Yüksek hijyen standartlarında üretim suyu, steril filtrasyon ve saf su hazırlama üniteleri.",
    icon: ShieldCheck,
  },
  {
    title: "Tarımsal Sera & Sulama",
    desc: "Yüksek tuzlu kuyu sularının desalinasyonu, damla sulama tıkanıklık önleme ve verim artırma.",
    icon: Layers,
  },
  {
    title: "Hastaneler & Laboratuvarlar",
    desc: "Diyaliz üniteleri, sterilizasyon cihazları ve hassas analizler için deiyonize ve saf su üretimi.",
    icon: Award,
  },
];

export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();
  const [selectedCat, setSelectedCat] = React.useState<ProductCategory>("all");
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const filteredProducts = React.useMemo(() => {
    if (selectedCat === "all") return PRODUCTS;
    return PRODUCTS.filter((p) => p.category === selectedCat);
  }, [selectedCat]);

  const scrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 74,
        behavior: "smooth",
      });
    }
  };

  const handleWhatsApp = (text?: string) => {
    const msg = encodeURIComponent(
      text ||
        "Merhaba Ren Endüstriyel, endüstriyel ve evsel su arıtma çözümleriniz hakkında detaylı bilgi ve fiyat teklifi almak istiyorum."
    );
    window.open(`https://wa.me/905443210000?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 overflow-x-hidden w-full selection:bg-[#0f9b8e] selection:text-white">
      {/* -------------------------------------------------------------
          0. Oturum Açık İse Üst Bildirim Çubuğu
          ------------------------------------------------------------- */}
      {session && (
        <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 text-center flex items-center justify-center gap-2 border-b border-slate-800">
          <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
          <span>Oturumunuz aktif: ({session.user?.email})</span>
          <Link
            href="/panel"
            className="inline-flex items-center gap-1 font-semibold text-white underline hover:text-[#0f9b8e] ml-1.5 transition-colors"
          >
            Yönetim Paneline Git <ArrowRight className="size-3" />
          </Link>
        </div>
      )}

      {/* -------------------------------------------------------------
          1. Header / Navbar
          ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo & Firma Adı */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="shrink-0 p-1 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs group-hover:border-[#0f9b8e]/40 transition-colors">
              <BrandMark size={38} className="object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 leading-tight">
                Ren Endüstriyel
              </div>
              <div className="font-semibold text-[11px] sm:text-xs text-[#0f9b8e] tracking-wide leading-none">
                Endüstriyel &amp; Evsel Su Teknolojileri
              </div>
            </div>
          </Link>

          {/* Menü Linkleri */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a
              href="#endustriyel"
              onClick={(e) => scrollTo("endustriyel", e)}
              className="hover:text-[#0f9b8e] transition-colors"
            >
              Endüstriyel
            </a>
            <a
              href="#evsel"
              onClick={(e) => scrollTo("evsel", e)}
              className="hover:text-[#0f9b8e] transition-colors"
            >
              Evsel &amp; Ofis
            </a>
            <a
              href="#urunler"
              onClick={(e) => scrollTo("urunler", e)}
              className="hover:text-[#0f9b8e] transition-colors"
            >
              Ürün Vitrini
            </a>
            <a
              href="#sektorler"
              onClick={(e) => scrollTo("sektorler", e)}
              className="hover:text-[#0f9b8e] transition-colors"
            >
              Uygulama Alanları
            </a>
            <a
              href="#hizmetler"
              onClick={(e) => scrollTo("hizmetler", e)}
              className="hover:text-[#0f9b8e] transition-colors"
            >
              Hizmetlerimiz
            </a>
            <Link
              href="/katalog"
              className="flex items-center gap-1 text-[#0f9b8e] hover:text-[#0d857a] transition-colors font-bold"
            >
              <span>Katalog</span>
              <ExternalLink size={13} />
            </Link>
            <a
              href="#iletisim"
              onClick={(e) => scrollTo("iletisim", e)}
              className="hover:text-[#0f9b8e] transition-colors"
            >
              İletişim
            </a>
          </nav>

          {/* Sağ Aksiyon Butonları */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/katalog"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors"
            >
              <FileText size={14} className="text-[#0f9b8e]" />
              <span>Dijital Katalog</span>
            </Link>

            <Link
              href="/giris"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl py-2 px-3.5 sm:px-4 text-xs sm:text-sm font-bold bg-[#0f9b8e] text-white hover:bg-[#0d857a] shadow-xs hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <span>Kurumsal Giriş</span>
              <ArrowRight size={14} />
            </Link>

            <button
              type="button"
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobil Menü */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1 animate-fade-in shadow-xl">
            {[
              ["#endustriyel", "Endüstriyel Su Sistemleri", "endustriyel"],
              ["#evsel", "Evsel & Ofis Arıtma", "evsel"],
              ["#urunler", "Tüm Ürün Vitrini", "urunler"],
              ["#sektorler", "Uygulama Alanları", "sektorler"],
              ["#hizmetler", "Kurumsal Hizmetlerimiz", "hizmetler"],
              ["#iletisim", "İletişim & Teklif", "iletisim"],
            ].map(([href, label, id]) => (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollTo(id, e)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0f9b8e] transition-colors"
              >
                {label}
              </a>
            ))}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/katalog"
                className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-[#0f9b8e] bg-[#f0fdfa] border border-[#0f9b8e]/20"
              >
                <FileText size={16} />
                <span>Online Dijital Katalog</span>
              </Link>
              <Link
                href="/giris"
                className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white bg-[#0f9b8e]"
              >
                <span>Yönetim ve Bayi Paneli Girişi</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* -------------------------------------------------------------
          2. Hero Section: Ren Endüstriyel Kurumsal Tanıtım
          ------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-white via-[#f0fdfa]/30 to-[#f8fafc]">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(#0f9b8e 0.75px, transparent 0.75px), radial-gradient(#0f9b8e 0.75px, #f8fafc 0.75px)",
            backgroundSize: "30px 30px",
            backgroundPosition: "0 0, 15px 15px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Sol Kolon: Metin ve Aksiyonlar */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f0fdfa] border border-[#0f9b8e]/30 text-[#0f9b8e] text-xs sm:text-sm font-bold mb-6 shadow-xs">
                <Sparkles size={15} className="text-[#0f9b8e]" />
                <span>Türkiye Geneli Satış, Montaj &amp; 7/24 Teknik Servis</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Su Arıtma Teknolojilerinde{" "}
                <span className="text-[#0f9b8e] underline decoration-[#0f9b8e]/30 underline-offset-8">
                  Endüstriyel ve Evsel
                </span>{" "}
                Mühendislik Çözümleri
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
                Yüksek debili sanayi tipi <strong>Ters Ozmoz (RO)</strong> ve{" "}
                <strong>Su Yumuşatma</strong> sistemlerinden, ev ve ofisler için yeni nesil{" "}
                <strong>alkali içme suyu</strong> cihazlarına; projelendirme, anahtar teslim montaj ve
                orijinal yedek parça tedariği.
              </p>

              {/* Butonlar */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
                <a
                  href="#urunler"
                  onClick={(e) => scrollTo("urunler", e)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 sm:px-7 text-sm sm:text-base font-bold bg-[#0f9b8e] text-white hover:bg-[#0d857a] shadow-md shadow-[#0f9b8e]/25 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <span>Ürün Gamını İncele</span>
                  <ChevronRight size={18} />
                </a>

                <button
                  type="button"
                  onClick={() => handleWhatsApp()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-5 sm:px-6 text-sm sm:text-base font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-xs transition-all"
                >
                  <MessageCircle size={18} className="text-[#10b981]" />
                  <span>WhatsApp Hızlı Teklif</span>
                </button>

                <Link
                  href="/katalog"
                  className="inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-5 text-sm sm:text-base font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <FileText size={18} className="text-[#0f9b8e]" />
                  <span>Online Katalog</span>
                </Link>
              </div>

              {/* Güven Rozetleri */}
              <div className="mt-10 pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">+15 Yıl</div>
                  <div className="text-xs text-slate-500 font-medium">Sektörel Tecrübe</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#0f9b8e]">%99.5</div>
                  <div className="text-xs text-slate-500 font-medium">Tuz &amp; Saflık Giderimi</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">7/24</div>
                  <div className="text-xs text-slate-500 font-medium">Teknik Servis Desteği</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#0f9b8e]">NSF / CE</div>
                  <div className="text-xs text-slate-500 font-medium">Sertifikalı Kalite</div>
                </div>
              </div>
            </div>

            {/* Sağ Kolon: Görsel Vitrin (Endüstriyel & Evsel Fotoğraflar) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xl group">
                <div className="aspect-[16/10] relative overflow-hidden bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/industrial-ro-system.jpg"
                    alt="Ren Endüstriyel Su Arıtma Sistemleri"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#0f9b8e] text-white uppercase tracking-wider inline-block mb-1">
                      Endüstriyel Çözüm
                    </span>
                    <h3 className="font-bold text-sm sm:text-base leading-snug">
                      Yüksek Kapasiteli Endüstriyel Ters Ozmoz (RO)
                    </h3>
                  </div>
                </div>
              </div>

              {/* Alt İkili Küçük Kart */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm p-3 flex flex-col justify-between">
                  <div className="aspect-[16/11] rounded-lg overflow-hidden bg-slate-100 relative mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/residential-purifier.jpg"
                      alt="Evsel Su Arıtma Cihazları"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#0f9b8e] uppercase">Ev &amp; Ofis</div>
                    <div className="font-bold text-xs text-slate-900 leading-tight">
                      Alkali Su Arıtma Cihazları
                    </div>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm p-3 flex flex-col justify-between">
                  <div className="aspect-[16/11] rounded-lg overflow-hidden bg-slate-100 relative mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/filtration-membranes.jpg"
                      alt="Orijinal RO Membran ve Yedek Parça"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#0f9b8e] uppercase">Sarf &amp; Valf</div>
                    <div className="font-bold text-xs text-slate-900 leading-tight">
                      Orijinal Membran &amp; Parça
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          3. İki Temel Segment: Endüstriyel vs. Evsel
          ------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Tüm İhtiyaçlar İçin Çift Yönlü Uzmanlık
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Fabrikalardan rezidanslara, hastanelerden müstakil evlere kadar her ölçekte kusursuz su kalitesi.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
            {/* 1. Endüstriyel Segment Kartı */}
            <article id="endustriyel" className="scroll-mt-24 rounded-3xl border border-slate-200 p-6 sm:p-8 bg-slate-50/60 hover:border-[#0f9b8e]/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Factory size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0f9b8e] uppercase tracking-wider">Sanayi &amp; Tesis</span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">Endüstriyel Su Arıtma Sistemleri</h3>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Üretim proseslerinde su kalitesi doğrudan verimliliği, makine ömrünü ve ürün standartlarını belirler. Yüksek kapasiteli sistemlerimiz kuyu suyunu, şebeke suyunu ve proses suyunu istenen mikron ve iletkenlik seviyesine arıtır.
                </p>

                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-[#0f9b8e] shrink-0 mt-0.5" />
                    <span><strong>Ters Ozmoz (RO):</strong> 1 m³/saat ile 100 m³/saat arası sanayi tipi desalinasyon üniteleri.</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-[#0f9b8e] shrink-0 mt-0.5" />
                    <span><strong>Tandem Su Yumuşatma:</strong> Buhar kazanları ve eşanjörler için kesintisiz kireç önleme.</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-[#0f9b8e] shrink-0 mt-0.5" />
                    <span><strong>Kum &amp; Karbon Filtrasyonu:</strong> Askıda katı madde, koku ve klor arıtımı.</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-[#0f9b8e] shrink-0 mt-0.5" />
                    <span><strong>Dozaj &amp; Antiskalant:</strong> Kimyasal dozaj pompaları ve membran koruma ürünleri.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500">Mühendislik &amp; Projelendirme</span>
                <button
                  type="button"
                  onClick={() => handleWhatsApp("Merhaba, endüstriyel su arıtma projemiz için keşif ve teklif rica ediyoruz.")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f9b8e] hover:text-[#0d857a]"
                >
                  <span>Endüstriyel Teklif İste</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </article>

            {/* 2. Evsel Segment Kartı */}
            <article id="evsel" className="scroll-mt-24 rounded-3xl border border-slate-200 p-6 sm:p-8 bg-slate-50/60 hover:border-[#0f9b8e]/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-12 w-12 rounded-2xl bg-[#0f9b8e] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Home size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0f9b8e] uppercase tracking-wider">Konut &amp; Ofis</span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">Evsel &amp; Bina İçi Çözümler</h3>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Ailenizin sağlığı ve evinizin tesisat güvenliği için yüksek kaliteli filtrasyon. Ağır metallerden, klor kokusundan ve kireç kalıntılarından arındırılmış zengin mineralli alkali su.
                </p>

                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-[#0f9b8e] shrink-0 mt-0.5" />
                    <span><strong>Tezgah Altı Kapalı Kasa Cihazlar:</strong> Kompakt, şık, NSF onaylı mineral &amp; alkali filtreli.</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-[#0f9b8e] shrink-0 mt-0.5" />
                    <span><strong>Bina &amp; Daire Girişi Arıtma:</strong> Çamaşır, bulaşık makineleri ve duş başlıklarını kireçten korur.</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-[#0f9b8e] shrink-0 mt-0.5" />
                    <span><strong>Arıtmalı Ofis Sebilleri:</strong> Damacana masrafı olmadan anında sıcak/soğuk arıtılmış su.</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 size={16} className="text-[#0f9b8e] shrink-0 mt-0.5" />
                    <span><strong>UV Dezenfeksiyon:</strong> Kimyasal kullanmadan %99.99 mikrobiyolojik arıtım.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500">Ücretsiz Kurulum &amp; Garanti</span>
                <button
                  type="button"
                  onClick={() => handleWhatsApp("Merhaba, evsel su arıtma cihazı modelleriniz ve montaj fiyatları hakkında bilgi almak istiyorum.")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f9b8e] hover:text-[#0d857a]"
                >
                  <span>Evsel Cihaz Teklifi İste</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          4. Ürün Vitrini (Kategori Sekmeleri & 12 Detaylı Kart)
          ------------------------------------------------------------- */}
      <section id="urunler" className="scroll-mt-24 py-16 sm:py-24 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f9b8e] mb-2">
                <Filter size={14} />
                <span>Ürün Portföyümüz</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Geniş Ürün ve Ekipman Gamı
              </h2>
              <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-2xl">
                Endüstriyel su arıtma tesislerinden evsel arıtma cihazlarına, orijinal sarf malzemelerden dozaj ekipmanlarına kadar tüm ürünler.
              </p>
            </div>

            {/* Kategori Sekme Butonları */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs self-start md:self-auto">
              {[
                { id: "all", label: "Tümü" },
                { id: "endustriyel", label: "Endüstriyel" },
                { id: "evsel", label: "Evsel & Ofis" },
                { id: "sarf", label: "Sarf & Membran" },
                { id: "dozaj", label: "Dozaj & Otomasyon" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCat(tab.id as ProductCategory)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    selectedCat === tab.id
                      ? "bg-[#0f9b8e] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ürün Kartları Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md hover:border-[#0f9b8e]/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Ürün Görsel Alanı */}
                  <div className="aspect-[16/10] bg-slate-900 overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/95 dark:bg-slate-900/90 text-slate-800 backdrop-blur-sm shadow-xs">
                        {p.categoryLabel}
                      </span>
                    </div>
                    {p.badge && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0f9b8e] text-white shadow-xs">
                        {p.badge}
                      </span>
                    )}
                  </div>

                  {/* İçerik */}
                  <div className="p-5">
                    <div className="text-xs font-bold text-[#0f9b8e] mb-1">{p.capacity}</div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug mb-2">
                      {p.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 line-clamp-2">
                      {p.desc}
                    </p>

                    {/* Teknik Özellikler Maddeleri */}
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      {p.specs.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle2 size={13} className="text-[#0f9b8e] shrink-0" />
                          <span className="truncate">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Kart Altı Aksiyon */}
                <div className="p-5 pt-0">
                  <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(`Merhaba, ${p.title} (${p.capacity}) ürünü için teknik bilgi ve fiyat teklifi almak istiyorum.`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 text-white hover:bg-[#0f9b8e] text-xs font-bold transition-colors"
                    >
                      <MessageCircle size={15} />
                      <span>Fiyat Teklifi Al</span>
                    </button>
                    <Link
                      href="/katalog"
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      title="Dijital Katalogda İncele"
                    >
                      <FileText size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/katalog"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-sm hover:border-[#0f9b8e] hover:text-[#0f9b8e] transition-all shadow-xs"
            >
              <FileText size={18} />
              <span>Tüm Ürünleri Online Katalogda Görüntüle</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          5. Sektörel Uygulama Alanları
          ------------------------------------------------------------- */}
      <section id="sektorler" className="scroll-mt-24 py-16 sm:py-20 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold text-[#0f9b8e] uppercase tracking-wider">Hizmet Alanlarımız</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
              Her Sektör İçin Hassas Su Standartları
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base">
              Endüstriyel tesislerden yaşam alanlarına kadar her alana uygun debi ve saflıkta su hazırlama altyapısı kuruyoruz.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {APPLICATION_AREAS.map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-[#0f9b8e]/20 text-[#0f9b8e] flex items-center justify-center mb-4">
                      <Icon size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-2">{a.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          6. Hizmetlerimiz & Kurumsal Süreç (4 Adım)
          ------------------------------------------------------------- */}
      <section id="hizmetler" className="scroll-mt-24 py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold text-[#0f9b8e] uppercase tracking-wider">Nasıl Çalışıyoruz?</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
              4 Adımda Anahtar Teslim Su Çözümü
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Doğru arıtma, doğru su analiziyle başlar. İhtiyaçlarınızı laboratuvar ortamında analiz edip en uygun sistemi projelendiriyoruz.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Su Analizi & Keşif",
                desc: "Ham suyun iletkenlik, sertlik, pH ve kimyasal analizi yapılarak arıtma kapasitesi netleştirilir.",
              },
              {
                step: "02",
                title: "Mühendislik & Tasarım",
                desc: "Tesisin debi ve basınç gereksinimlerine göre en verimli membran, pompa ve tank konfigürasyonu modellenir.",
              },
              {
                step: "03",
                title: "İmalat & Montaj",
                desc: "Sertifikalı malzemelerle üretilen üniteler uzman teknik ekiplerimizce sahada kurulup devreye alınır.",
              },
              {
                step: "04",
                title: "Periyodik Bakım & Servis",
                desc: "Periyodik membran kimyasal yıkama (CIP), filtre değişimi ve 7/24 teknik servis güvencesi.",
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-slate-200 p-6 bg-slate-50/50 relative">
                <div className="text-3xl font-black text-[#0f9b8e]/40 mb-2 font-mono">{s.step}</div>
                <h3 className="font-extrabold text-base text-slate-900 mb-2">{s.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          7. Kurumsal B2B & Müşteri Portalı Çağrısı
          ------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#0f9b8e]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f9b8e]/20 text-[#0f9b8e] text-xs font-bold mb-4">
                <Zap size={14} />
                <span>B2B &amp; Kurumsal İşletme Portalı</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                Ren Endüstriyel Müşteri &amp; Bayi Portalı
              </h2>
              <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Kayıtlı bayilerimiz, kurumsal müşterilerimiz ve servis ortaklarımız için tek ekrandan anlık sipariş verme, cari bakiye takibi, teklif onaylama ve e-fatura görüntüleme imkanı.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <Link
                href="/giris"
                className="inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 font-bold text-sm sm:text-base bg-[#0f9b8e] text-white hover:bg-[#0d857a] shadow-lg shadow-[#0f9b8e]/25 transition-all text-center"
              >
                <span>Yönetim ve Bayi Girişi</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/katalog"
                className="inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 font-semibold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors text-center"
              >
                <FileText size={16} />
                <span>Online Dijital Katalog</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          8. İletişim & Hızlı Fiyat Teklifi
          ------------------------------------------------------------- */}
      <section id="iletisim" className="scroll-mt-24 py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            {/* Sol: İletişim Bilgileri */}
            <div className="lg:col-span-5">
              <span className="text-xs font-bold text-[#0f9b8e] uppercase tracking-wider">Bize Ulaşın</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 mb-4">
                Projeniz İçin Hızlı Fiyat Teklifi Alın
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-8">
                İster fabrika tipi ters ozmoz tesisi, ister evsel su yumuşatma cihazı olsun; mühendis ekibimiz projenize en uygun çözümü aynı gün içinde fiyatlandırsın.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="h-10 w-10 rounded-lg bg-[#0f9b8e]/10 text-[#0f9b8e] flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Telefon / Destek</div>
                    <a href="tel:+902120000000" className="font-bold text-slate-900 hover:text-[#0f9b8e] transition-colors text-sm">
                      +90 (212) 000 00 00
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="h-10 w-10 rounded-lg bg-[#10b981]/10 text-[#10b981] flex items-center justify-center shrink-0">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">WhatsApp Hızlı Sipariş</div>
                    <button
                      type="button"
                      onClick={() => handleWhatsApp()}
                      className="font-bold text-slate-900 hover:text-[#10b981] transition-colors text-sm"
                    >
                      +90 (544) 321 00 00 (Canlı Destek)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Kurumsal E-posta</div>
                    <a href="mailto:destek@renendustriyel.com" className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-sm">
                      destek@renendustriyel.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Çalışma Saatleri</div>
                    <div className="font-bold text-slate-900 text-sm">
                      Pazartesi - Cumartesi: 08:30 - 18:30
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sağ: Hızlı Teklif Formu */}
            <div className="lg:col-span-7 bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-1">Hızlı Teklif Talep Formu</h3>
              <p className="text-xs text-slate-500 mb-6">Bilgilerinizi bırakın, uzman teknik temsilcimiz 30 dakika içinde sizinle iletişime geçsin.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const name = target.ad?.value || "";
                  const tel = target.tel?.value || "";
                  const type = target.tip?.value || "Endüstriyel Su Arıtma";
                  const note = target.not?.value || "";
                  handleWhatsApp(`Hızlı Teklif Talebi:\nAd Soyad: ${name}\nTelefon: ${tel}\nİhtiyaç Alanı: ${type}\nAçıklama: ${note}`);
                }}
                className="space-y-4"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Adınız Soyadınız / Firma</label>
                    <input
                      name="ad"
                      required
                      type="text"
                      placeholder="Örn: Ahmet Yılmaz / ABC Gıda"
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Telefon Numaranız</label>
                    <input
                      name="tel"
                      required
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      className="input text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">İhtiyaç Alanı</label>
                  <select name="tip" className="input text-sm">
                    <option value="Endüstriyel Ters Ozmoz (RO)">Endüstriyel Ters Ozmoz (RO)</option>
                    <option value="Endüstriyel Su Yumuşatma">Endüstriyel Su Yumuşatma</option>
                    <option value="Evsel Kapalı Kasa Su Arıtma Cihazı">Evsel Kapalı Kasa Su Arıtma Cihazı</option>
                    <option value="Bina / Daire Girişi Arıtma">Bina / Daire Girişi Arıtma</option>
                    <option value="Sarf Malzeme, Membran ve Reçine">Sarf Malzeme, Membran ve Reçine</option>
                    <option value="Teknik Servis ve Membran Yıkama">Teknik Servis ve Membran Yıkama</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Proje Notu veya Sorunuz</label>
                  <textarea
                    name="not"
                    rows={3}
                    placeholder="Günlük su tüketiminiz, ham su kaynağınız (kuyu/şebeke) veya cihaz talebiniz..."
                    className="input text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0f9b8e] text-white hover:bg-[#0d857a] font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  <span>Teklif Talebini WhatsApp İle Gönder</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          9. Footer
          ------------------------------------------------------------- */}
      <footer className="border-t border-slate-200 bg-white pt-12 pb-10 text-sm text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200">
            {/* Sütun 1: Logo & Hakkında */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <BrandMark size={34} className="object-contain" />
                <span className="font-extrabold text-lg text-slate-900">Ren Endüstriyel</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Endüstriyel ve evsel su arıtma teknolojileri alanında güvenilir mühendislik, imalat, satış ve teknik servis ortağınız.
              </p>
              <div className="text-xs text-slate-400 mt-1">
                İstanbul, Türkiye
              </div>
            </div>

            {/* Sütun 2: Endüstriyel Çözümler */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                Endüstriyel Çözümler
              </h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#endustriyel" onClick={(e) => scrollTo("endustriyel", e)} className="hover:text-[#0f9b8e]">Ters Ozmoz (RO) Sistemleri</a></li>
                <li><a href="#endustriyel" onClick={(e) => scrollTo("endustriyel", e)} className="hover:text-[#0f9b8e]">Endüstriyel Su Yumuşatma</a></li>
                <li><a href="#endustriyel" onClick={(e) => scrollTo("endustriyel", e)} className="hover:text-[#0f9b8e]">Multimedya Kum &amp; Karbon</a></li>
                <li><a href="#endustriyel" onClick={(e) => scrollTo("endustriyel", e)} className="hover:text-[#0f9b8e]">Konteyner Tipi Mobil Arıtma</a></li>
                <li><a href="#endustriyel" onClick={(e) => scrollTo("endustriyel", e)} className="hover:text-[#0f9b8e]">Kimyasal Dozaj Pompaları</a></li>
              </ul>
            </div>

            {/* Sütun 3: Evsel & Sarf */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                Evsel &amp; Sarf Malzeme
              </h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#evsel" onClick={(e) => scrollTo("evsel", e)} className="hover:text-[#0f9b8e]">Tezgah Altı Arıtma Cihazları</a></li>
                <li><a href="#evsel" onClick={(e) => scrollTo("evsel", e)} className="hover:text-[#0f9b8e]">Bina Girişi Tortu &amp; Kireç Önleme</a></li>
                <li><a href="#evsel" onClick={(e) => scrollTo("evsel", e)} className="hover:text-[#0f9b8e]">Ofis Su Sebilleri</a></li>
                <li><Link href="/katalog" className="hover:text-[#0f9b8e]">Dow &amp; Toray RO Membranlar</Link></li>
                <li><Link href="/katalog" className="hover:text-[#0f9b8e]">Katyonik Reçineler &amp; Kartuşlar</Link></li>
              </ul>
            </div>

            {/* Sütun 4: Hızlı Linkler & Portal */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                Kurumsal Portal
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/giris" className="font-bold text-[#0f9b8e] hover:underline">Bayi &amp; Müşteri Girişi</Link></li>
                <li><Link href="/katalog" className="hover:text-[#0f9b8e]">Online Ürün Kataloğu</Link></li>
                <li><a href="#iletisim" onClick={(e) => scrollTo("iletisim", e)} className="hover:text-[#0f9b8e]">Teklif &amp; İletişim</a></li>
                <li><span className="text-slate-400">Gizlilik &amp; KVKK Politikası</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>© {new Date().getFullYear()} Ren Endüstriyel · Su Arıtma &amp; Teknolojileri. Tüm hakları saklıdır.</div>
            <div className="flex items-center gap-4">
              <span>Kurumsal Kalite</span>
              <span>·</span>
              <span>ISO &amp; NSF Standartları</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
