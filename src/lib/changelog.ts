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

export const LATEST_VERSION = "1.3.2";

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: "1.3.2",
    date: "29 Eylül 2026",
    title: "Evrensel Tablo Sıralama, Hızlı Ürün Satırı & E-Fatura / E-Arşiv Modülü",
    badge: "Mevcut Sürüm",
    items: [
      {
        type: "yeni",
        title: "E-Fatura & E-Arşiv Ana Modülü",
        description:
          "Sol menüde Stok modülünün altına Fatura Oluştur (e-Fatura / e-Arşiv seçimli), Gelen E-Faturalar, Giden E-Faturalar ve Fatura KDV Raporu eklendi.",
      },
      {
        type: "yeni",
        title: "Evrensel Tablo Sıralama (Tüm Listelemelerde)",
        description:
          "Tüm tablolarda İsim, Tarih, Açıklama, Borç, Alacak, Bakiye ve Tutar sütun başlıklarına tıklandığında anında alfabetik ve sayısal sıralama (Artan / Azalan) desteği getirildi.",
      },
      {
        type: "iyilestirme",
        title: "Otomatik Satır Geçişi ve Ürün Arama Odaklanması",
        description:
          "Alış, satış, irsaliye, fatura, teklif ve sipariş girişlerinde fiyat veya iskonto girilip Enter tuşuna basıldığında yeni satırın ürün arama kutusu doğrudan açılır ve klavyeyle kesintisiz yazmaya devam edilir.",
      },
      {
        type: "iyilestirme",
        title: "KDV Oranı Stepper Butonları (▲ / ▼)",
        description:
          "Fatura satırlarındaki KDV kutusunun yanına yukarı/aşağı butonları ve klavye Yukarı/Aşağı yön tuşu desteği eklendi (%0 -> %1 -> %10 -> %20 geçişi).",
      },
      {
        type: "yeni",
        title: "GİB Standart Fatura Önizleme & UBL-TR 2.1 XML",
        description:
          "Gelen ve kesilen tüm faturalar resmi GİB mühürlü görsel şablonunda görüntülenebilir, yazdırılabilir ve UBL XML olarak dışa aktarılabilir.",
      },
      {
        type: "yeni",
        title: "Fatura KDV Beyanname Raporu",
        description:
          "Oran bazında (%1, %10, %20) satış matrahı, hesaplanan KDV, alış matrahı ve indirilecek KDV ile net ödenecek/devreden KDV takibi ve Excel raporlama eklendi.",
      },
    ],
  },
  {
    version: "1.3.1",
    date: "28 Eylül 2026",
    title: "Son Hareketler Peşin/Vadeli/Ödeme Tipi & Sipariş Bakiye Entegrasyonu",
    items: [
      {
        type: "yeni",
        title: "Son Hareketler Rozetleri: Peşin (P), Vadeli (V), Kredi Kartı (KK), Havale/EFT (Hav/Eft)",
        description:
          "Paneldeki son hareketler tablosunda tutarların yanına parantez içinde (P), (V), (KK), (Hav/Eft) durum etiketleri eklendi ve Cari İsmi belirginleştirildi.",
      },
      {
        type: "yeni",
        title: "Sipariş Kaydedildiği Anda Cari Bakiyeye İşleme",
        description:
          "Satış ve satın alma siparişleri oluşturulduğu anda cari bakiyesine gerçek zamanlı olarak yansıtılır.",
      },
      {
        type: "yeni",
        title: "Çıktılarda ve Ekranda Güncel Toplam Bakiye",
        description:
          "PDF, yazdırma ve ekran çıktılarında genel toplamın altında Önceki Bakiye, Bu Belge Tutarı ve Güncel Toplam Bakiye (Borçlu/Alacaklı) gösterilir.",
      },
      {
        type: "iyilestirme",
        title: "Genişletilmiş Ürün Seçici",
        description:
          "Satış, alış, fatura, sipariş ve teklif düzenleme ekranlarında ürün yanındaki açıklama kutusu kaldırılarak ürün seçici tam genişliğe uzatıldı.",
      },
      {
        type: "duzeltme",
        title: "Son Hareketlerde Mükerrer Masraf Kaydı Düzeltildi",
        description:
          "Masraf girildiğinde hem masraf belgesi hem ödeme hareketinin çift görünmesi engellendi, temiz tek satır gösterim sağlandı.",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "28 Eylül 2026",
    title: "Günlük Yedekleme, Masaüstü EXE & Mobil Yükleme Desteği",
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
