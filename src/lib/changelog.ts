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

export const LATEST_VERSION = "2.2.0";

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: "2.2.0",
    date: "1 Ekim 2026",
    title: "Yapay Zeka Sabah Yönetici Analizi, Kâr/Zarar Trend Grafiği, Canlı Kurlarla Satış ve Pusulam Birebir Ürün Detayı",
    badge: "Büyük Güncelleme",
    items: [
      {
        type: "yeni",
        title: "Yapay Zeka Sabah Yönetici Analizi & Aksiyon Önerileri (AI Briefing)",
        description:
          "Ana sayfanın en üstünde dün, geçen hafta ve bu ayki satış, alış ve sipariş verilerini otomatik analiz eden yönetici özeti ve öncelikli aksiyon butonları (Bekleyen Siparişleri Faturalandır, Kritik Stok Takviyesi, Vadesi Gelen Alacaklar, Marj Kontrolü) devreye alındı.",
      },
      {
        type: "yeni",
        title: "İşletme Kârda mı / Zararda mı Skorbordu & 3 Periyotlu Trend Çizgi Grafiği",
        description:
          "Panelin en üstünde dinamik KÂRDA / ZARARDA durum rozeti, net marj yüzdesi, aylık ciro büyüme oranı ile Günlük (14G), Haftalık (8H) ve Aylık (12A) periyotlarında Gelir, Gider ve Net Kâr eğrilerini gösteren interaktif Recharts trend çizgi grafiği eklendi.",
      },
      {
        type: "yeni",
        title: "Döviz Modülü Sayfa Altına Taşındı · TCMB Canlı Kurlarla Aylık Satış Karşılıkları",
        description:
          "Döviz özeti sayfanın en altına konumlandırıldı. Bu ayki satış cirosunun TCMB anlık kurlarıyla ₺ TRY, $ USD, € EUR, £ GBP ve Has Altın (Gram) karşılıkları, döviz kasaları ve canlı mini kur çevirici hizmete sunuldu.",
      },
      {
        type: "yeni",
        title: "Pusulam Birebir Ürün Detay Sayfası & Hızlı Ticaret Modalleri",
        description:
          "Ürün detay sayfası Pusulam ile 1:1 eşleştirildi: Hızlı Satış, Hızlı Alış, Fiyat Gör modalleri, barkod alanı, KDV dahil/hariç hesaplayıcı ve tam hareket geçmişi entegre edildi.",
      },
      {
        type: "iyilestirme",
        title: "Tailwind CSS v4 & IDE Linter Standardizasyonu",
        description:
          "@custom-variant ve @theme direktifleri VS Code ve IDE denetleyicisine tanıtılarak sistem kararlılığı sağlandı.",
      },
    ],
  },
  {
    version: "2.1.6",
    date: "30 Eylül 2026",
    title: "Yığın Taşması (Call Stack) Düzeltmesi, Grafik Eksen Korumaları ve Render Optimizasyonu",
    badge: "Sistem & Performans",
    items: [
      {
        type: "duzeltme",
        title: "Panel Yükleme ve Yığın Taşması (Stack Overflow) Çözümü",
        description:
          "Büyüme & Sağlık skorbordunda ve grafik eksen hesaplamalarında veri yüklenirken oluşan sayısal taşma riski güvene alındı; tarayıcı kilitlenmeleri ve 'Maximum call stack size exceeded' hatası tamamen giderildi.",
      },
      {
        type: "iyilestirme",
        title: "Global Context ve Render Optimizasyonu",
        description:
          "Kurum sağlayıcısı (OrgProvider), stok uyarı modülü ve satış grafikleri React.useMemo ile güçlendirilerek gereksiz sayfa yenilenmeleri önlendi.",
      },
      {
        type: "yeni",
        title: "Eksi Stok Uyarı ve Engelleme Modülü",
        description:
          "Ayarlar -> Stok ve Depolar altından yönetilebilen eksi stok uyarısı ve eksiye düşmeyi engelleme tercihleri ile ürün kartlarında alış/satış için bağımsız KDV dahil/hariç seçenekleri devreye alındı.",
      },
    ],
  },
  {
    version: "2.1.4",
    date: "30 Eylül 2026",
    title: "Alış & Satış Faturalarında Yeni Resmi Muhasebe Baskı ve PDF Şablonu",
    badge: "Yeni Şablon",
    items: [
      {
        type: "yeni",
        title: "Birebir Muhasebe Fatura Baskı Şablonu",
        description:
          "Alış ve satış faturaları için kurumsal siyah çerçeveli, üst başlık, şirket ve cari/vergi detayları, tam hizalı stok kalemleri, cari son bakiye ve toplamlar tablosunu içeren yeni fatura şablonu devreye alındı.",
      },
      {
        type: "iyilestirme",
        title: "Doğrudan Yazdırma ve PDF Çıktısı Entegrasyonu",
        description:
          "Hem tarayıcı üzerinden yazdırma (Ctrl+P / Yazdır butonu) hem de PDF indirme çıktısı yeni şablonla birebir senkronize edildi.",
      },
    ],
  },
  {
    version: "2.1.3",
    date: "29 Eylül 2026",
    title: "Hesap Ekstresi & Tüm Hareketlerde PDF İndirme ve Yazdırma · Alış KDV Birebir Senkronizasyonu",
    badge: "Önemli Güncelleme",
    items: [
      {
        type: "duzeltme",
        title: "Windows Paylaşım Penceresi Kaldırıldı & Doğrudan PDF Çıktısı",
        description:
          "Hesap ekstresi ve belgelerde PDF aç tıklandığında Windows işletim sistemi paylaşım (OneNote/Bluetooth) penceresinin açılması engellendi. Artık doğrudan tek tıkla PDF indirme veya tarayıcıda anında yazdırma/görüntüleme sağlanıyor.",
      },
      {
        type: "yeni",
        title: "Tüm Liste ve Hareketlerde PDF İndirme & Yazdırma Desteği",
        description:
          "Cari Hesap Ekstresi, Kasa/Banka Hesap Hareketleri, Tahsilat ve Ödemeler, Stok Hareketleri, Fatura/Belge Listeleri ve Ürün Listelerinin tamamına 'Yazdır / Görüntüle' ve 'PDF İndir' butonları eklendi.",
      },
      {
        type: "iyilestirme",
        title: "Alış Faturalarında KDV Hariç Seçimi Stok Kartına Birebir İşlenir",
        description:
          "Toplu sabitleme kaldırıldı. Alış faturasında 'KDV Hariç' seçili olduğu takdirde girilen ürünlerin stok kartına da kesinlikle KDV hariç olarak kaydedilmesi kuralı kalıcı olarak devreye alındı.",
      },
    ],
  },
  {
    version: "2.1.2",
    date: "29 Eylül 2026",
    title: "Alış Faturası ve Ürün Kartlarında KDV Hariç Alış Fiyatı Standardizasyonu & Otomatik Düzeltme",
    badge: "Önemli İyileştirme",
    items: [
      {
        type: "iyilestirme",
        title: "Tüm Ürünlerin Alış Fiyatları KDV Hariç Olarak Sabitlendi",
        description:
          "Alış faturaları ile girilen tüm ürünlerin birim fiyatları kesin ve kalıcı olarak KDV Hariç olarak normalize edildi. Sistemde 'KDV dahil' görünen eski kayıtlar arka planda otomatik onarılarak KDV Hariç standardına getirildi.",
      },
      {
        type: "duzeltme",
        title: "Ürün Kartı Fiyat & KDV Anahtarı Bağımsızlaştırıldı",
        description:
          "Ürün kartı ekleme ve düzenleme ekranında satış fiyatı için KDV Dahil seçildiğinde alış fiyatının da hatalı şekilde KDV Dahil olarak değişmesi engellendi; alış fiyatı 'KDV Hariç' olarak ayrıştırıldı.",
      },
      {
        type: "iyilestirme",
        title: "Alış Faturası Kaydında Ürün Kartı Alış Fiyatı Otomatik Güncelleme",
        description:
          "Alış faturası ve irsaliyelerinde ürün fiyatı girildiğinde, ürün kartındaki alış fiyatı ve KDV oranı otomatik olarak KDV hariç net tutar üzerinden hafızaya alınır.",
      },
    ],
  },
  {
    version: "2.1.1",
    date: "29 Eylül 2026",
    title: "Zarar Önleme & Fiyat Farkı Çözülen Kayıtların Listeden Kaldırılması & Arşiv Yönetimi",
    badge: "İyileştirme Güncellemesi",
    items: [
      {
        type: "iyilestirme",
        title: "Çözülen Fiyat Farklarının Listeden Otomatik Kaldırılması",
        description:
          "Zarar Önleme & Fiyat Farkları modülünde 'Çözüldü Olarak İşaretle' butonuna basıldığında kayıt anında aktif inceleme listesinden ve toplam zarar sayacından kaldırılır; temiz ve odaklı bir görünüm sağlanır.",
      },
      {
        type: "yeni",
        title: "Çözülenler (Arşiv) Sekmesi, Geri Alma ve Kalıcı Silme",
        description:
          "Çözülen tüm geçmiş kayıtlar yeni eklenen 'Çözülenler (Arşiv)' filtresi altında incelenebilir; istenirse tek tıkla 'Listeye Geri Al' denilerek aktif takibe döndürülebilir veya kalıcı olarak silinebilir.",
      },
    ],
  },
  {
    version: "2.1.0",
    date: "29 Eylül 2026",
    title: "REN AI Günlük Sabah Brifingi, Ölü Stok Kampanya Önerileri & Gelişmiş Finansal Asistan",
    badge: "Büyük Ana Güncelleme",
    items: [
      {
        type: "yeni",
        title: "☀️ Her Sabah Günlük Yönetici Brifingi (Dashboard & Yapay Zeka)",
        description:
          "Ana sayfada ve Yapay Zeka merkezinde her sabah otomatik brifing: Bugün ve geciken tahsilatlar, yapılması gereken ödemeler, net nakit akışı projeksiyonu, yıldız ürünlerin stok tükenme günleri tek bakışta.",
      },
      {
        type: "yeni",
        title: "📦 Hareketsiz Stok Radarı & AI Kampanya Oluşturma Fikirleri",
        description:
          "30 günden uzun süredir satılmayan ürünler ve depoda kilitli kalan toplam sermaye tespit edilir. Yapay zeka bu ürünleri eritmek için 'Çapraz Promosyon (Bundle)', 'Toplu Tasfiye İskontosu' ve 'Flaş Marj' stratejileri önerir; tek tıkla kampanyalı teklif açılabilir.",
      },
      {
        type: "yeni",
        title: "⚡ Müşteri Tahsilat Radarı & 1-Tık WhatsApp Hatırlatma",
        description:
          "Vadesi geçen ve ödemesi beklenen müşteriler için tutar ve vadesi hesaplanmış nazik WhatsApp tahsilat hatırlatma mesajları tek tıkla panoya kopyalanabilir.",
      },
      {
        type: "yeni",
        title: "🤖 Gelişmiş REN AI Finansal Asistan (3 Ayrı Modül)",
        description:
          "Yapay Zeka sayfası 3 sekmeli profesyonel komuta merkezine dönüştürüldü: Günlük Sabah Brifingi, Zarar Önleme & Fiyat Farkları ve canlı ERP verileriyle interaktif konuşabilen REN AI Finansal Asistan.",
      },
    ],
  },
  {
    version: "2.0.0",
    date: "29 Eylül 2026",
    title: "REN Yapay Zeka (Kâr Koruma Kalkanı), Otomatik Ekran Kaydırma & KDV Hafızası",
    badge: "Büyük Ana Güncelleme",
    items: [
      {
        type: "yeni",
        title: "REN Yapay Zeka · Kâr Koruma ve Finansal Denetim Kalkanı",
        description:
          "Alış faturaları kaydedilirken aynı tedarikçiden yapılan geçmiş alımlar anlık taranır. Tedarikçi önceki faturada iskonto uygulayıp yenisinde uygulamadıysa veya birim fiyatı artırdıysa REN AI aradaki net zararı hesaplar, uyarır ve tek tıkla Fiyat Farkı Faturası kesmenizi sağlar.",
      },
      {
        type: "yeni",
        title: "1-Tıkla Fiyat Farkı Faturası ve WhatsApp İtiraz Metni",
        description:
          "Yapay zekanın tespit ettiği iskonto kayıpları için doğrudan tedarikçiye düzenlenecek Fiyat Farkı Faturası şablonu oluşturulabilir; tek tıkla WhatsApp veya E-Posta itiraz metni kopyalanabilir.",
      },
      {
        type: "yeni",
        title: "REN Yapay Zeka Finansal Asistan & Komuta Merkezi",
        description:
          "Sol menüye eklenen 'REN Yapay Zeka' merkezi ile toplam kâr kayıpları, bekleyen fiyat farkları ve tedarikçi fiyat oynaklıkları 7/24 izlenir; akıllı asistana şirket verileriyle ilgili sorular sorulabilir.",
      },
      {
        type: "iyilestirme",
        title: "Fatura ve Giriş Satırlarında Otomatik Ekran Kaydırma",
        description:
          "Fatura, sipariş ve irsaliyelerde ürün ve fiyat bilgisi girilip Enter ile alt satıra geçildiğinde ekran akıcı bir şekilde yukarı kayarak yeni satırı ekranın tam ortasına getirir; fareyle aşağı kaydırma zorunluluğu kalktı.",
      },
      {
        type: "iyilestirme",
        title: "Alışlarda Ürün Kartı KDV Hafızası",
        description:
          "Alış faturalarında girilen veya güncellenen KDV oranları stok kartı hafızasına da kalıcı olarak işlenir; bir sonraki işlemde ürün seçildiğinde en son alıştaki güncel KDV oranı otomatik yüklenir.",
      },
    ],
  },
  {
    version: "1.3.3",
    date: "29 Eylül 2026",
    title: "Sade Satır Girişi, Doğrudan KDV, GİB & Satış Notu Çıktıları ve Eksi Stok Bildirimi",
    badge: "Önceki Sürüm",
    items: [
      {
        type: "yeni",
        title: "Sade ve Serbestçe Yazılabilir Fatura Kalemleri",
        description:
          "Stokta olmayan ürün veya serbest hizmet girilirken sayfadan ayrılma zorunluluğu kaldırıldı; satıra doğrudan ürün/hizmet adı yazılabilir ve stok önerilerinden anında seçilebilir.",
      },
      {
        type: "iyilestirme",
        title: "Doğrudan KDV Oranı Yazımı",
        description:
          "KDV alanındaki ok butonları yerine kutucuğa doğrudan odaklanıp 0, 1, 10, 20 veya istenen oran elle yazılabilir hale getirildi.",
      },
      {
        type: "yeni",
        title: "Resmi GİB E-Fatura Çıktı Ekranı & PDF",
        description:
          "Fatura yazdırma ve PDF indirme şablonu Gelir İdaresi Başkanlığı resmi şablonuna (GİB amblemi, karekod, ETTN, KDV GERÇEK dökümü ve IBAN notu) tam uyumlu hale getirildi.",
      },
      {
        type: "yeni",
        title: "SATIŞ NOTU / SİPARİŞ NOTU Çıktı Ekranı",
        description:
          "Sipariş ve satış belgeleri için antetli, bakiye bilgili, sade ve kurumsal 'SATIŞ NOTU' şablonu eklendi.",
      },
      {
        type: "iyilestirme",
        title: "Eksiye Düşen Stok Bildirimi",
        description:
          "Kritik stok widget'ı anasayfadan kaldırılarak yalnızca ürün mevcudu eksiye düştüğünde sistem tarafından anlık uyarı bildirimi gösterilmesi sağlandı.",
      },
    ],
  },
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
