export type ChangelogType = "yeni" | "iyilestirme" | "duzeltme";

export interface ChangelogItem {
  type: ChangelogType;
  title: string;
  description?: string;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  title: string;
  badge?: string;
  items: ChangelogItem[];
}

export const LATEST_VERSION = "1.3.0";

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: "1.3.0",
    date: "28 Eylül 2026",
    title: "Günlük Yedekleme, Masaüstü EXE & Mobil Yükleme Desteği",
    badge: "Mevcut Sürüm",
    items: [
      {
        type: "yeni",
        title: "Otomatik Günlük Canlı Yedekleme",
        description:
          "Canlı veritabanınız her sabah belirlediğiniz klasöre (tarih tarih veya üstüne yazma moduyla) otomatik yedeklenir. Ayarlar menüsünden tek tıkla anlık JSON yedek indirme ve Windows Görev Zamanlayıcı entegrasyonu sağlandı.",
      },
      {
        type: "yeni",
        title: "Masaüstü EXE Versiyonu (Windows)",
        description:
          "Bağımsız 'Ren Endüstriyel.exe' masaüstü programı kuruldu. İnternet varken canlı bulutla entegre çalışır; internet kesildiğinde dahi çevrimdışı tam yetkiyle çalışmaya devam eder.",
      },
      {
        type: "yeni",
        title: "Telefon ve Tabletler İçin 'Uygulama Yükle'",
        description:
          "Mobil cihazlar için tek dokunuşla ana ekrana yükleme butonu, akıllı öneri şeridi ve iOS Safari adım adım kurulum rehberi eklendi.",
      },
      {
        type: "iyilestirme",
        title: "Kesintisiz Çevrimdışı (Offline-First) Senkronizasyon",
        description:
          "Masaüstünde ve mobilde internet olmasa bile cari, stok ve fatura kayıtları yerel bellekte tutulur, internet bağlantısı sağlandığında otomatik olarak canlıya aktarılır.",
      },
      {
        type: "iyilestirme",
        title: "GitHub Actions Otomatik Bulut Yedeği",
        description:
          "Bilgisayarınız kapalı olsa dahi her sabah saat 08:00'de GitHub sunucularında canlı veritabanı yedeği güvenle arşivlenir.",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "28 Eylül 2026",
    title: "Yeni Nesil Panel, Satış Trendi & Canlı Güncelleme Takibi",
    items: [
      {
        type: "yeni",
        title: "Modern Gösterge Paneli",
        description:
          "Pusulam ve Paraşüt standartlarında yenilenmiş anlık durum paneli: Renkli KPI kartları, aylık ciro, masraflar, tahsilat ve kasa durumları.",
      },
      {
        type: "yeni",
        title: "14 Günlük Satış Grafiği",
        description:
          "Son 14 günün ciro ve satış akışını gösteren, günlük ve aylık analiz geçişli yumuşak dalgalı interaktif grafik.",
      },
      {
        type: "yeni",
        title: "En Çok Satan Ürünler Kartları",
        description:
          "İşletmenizde en çok ciro getiren ilk 4 ürünün satış adedi, toplam tutarı ve detaylı analizi.",
      },
      {
        type: "yeni",
        title: "Sabit Güncelleme Notları & Bildirimler",
        description:
          "Sol alt menüde sabit duran ve her yeni sürümde bildirimle uyaran güncelleme takip sistemi.",
      },
      {
        type: "iyilestirme",
        title: "Ürün ve Stok Listesi İyileştirmeleri",
        description:
          "Kritik stok seviye uyarıları, gelişmiş filtreleme ve anlık stok hareket takibi hızlandırıldı.",
      },
      {
        type: "iyilestirme",
        title: "Kısmi Tahsilat ve Cari Mutabakat",
        description:
          "Faturalarla yapılan çoklu ödeme ve tahsilatların dağıtımı optimize edildi, bakiye hesaplamaları tek işlemde tutarlı hale getirildi.",
      },
      {
        type: "duzeltme",
        title: "TCMB Kurları & Veri Sıfırlama Altyapısı",
        description:
          "Döviz kurlarının otomatik senkronu ve Ayarlar bölümüne yeni veri sıfırlama/temizleme altyapısı eklendi.",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "23 Eylül 2026",
    title: "PWA Çevrimdışı Çalışma & Hızlı Satış (POS)",
    items: [
      {
        type: "yeni",
        title: "PWA Çevrimdışı Mod (Offline)",
        description:
          "İnternet bağlantısı kesildiğinde dahi kesintisiz çalışma ve bağlantı geldiğinde otomatik eşitleme desteği.",
      },
      {
        type: "yeni",
        title: "Hızlı Satış (POS) Modülü",
        description:
          "Kamera ile barkod okutma, hızlı sepet oluşturma ve nakit/kart anında tahsilat desteği.",
      },
      {
        type: "iyilestirme",
        title: "PDF Fatura ve Ekstre Şablonları",
        description:
          "Tarayıcıda anında üretilen ve WhatsApp/e-posta ile paylaşılabilen profesyonel PDF çıktıları.",
      },
    ],
  },
];

const STORAGE_KEY = "ren_last_seen_changelog_version";

export function getStoredChangelogVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredChangelogVersion(version: string = LATEST_VERSION): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {}
}

export function hasUnreadChangelog(): boolean {
  const stored = getStoredChangelogVersion();
  return stored !== LATEST_VERSION;
}
