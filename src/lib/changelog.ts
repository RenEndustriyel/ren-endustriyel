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

export const LATEST_VERSION = "1.2.0";

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: "1.2.0",
    date: "28 Eylül 2026",
    title: "Yeni Nesil Panel, Satış Trendi & Canlı Güncelleme Takibi",
    badge: "Mevcut Sürüm",
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
