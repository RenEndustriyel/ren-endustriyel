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

export const LATEST_VERSION = "2.4.70";

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: "2.4.70",
    date: "3 Ekim 2026",
    title: "Akıllı Satış Fiyatlandırma ve Dinamik Piyasa Motoru (Smart Pricing Engine)",
    badge: "Akıllı Fiyat & Piyasa Motoru",
    items: [
      {
        type: "yeni",
        title: "Dükkân Gider Payı ve Hedef Kâr Optimizasyonu",
        description:
          "Alış faturası maliyetine dükkânın kira, elektrik, nakliye ve personel operasyonel gider payını (%12, %13, %14, %15) ekleyen ve hedef kâr marjı ile başabaş noktasını koruyan akıllı hesaplama motoru devreye alındı.",
      },
      {
        type: "yeni",
        title: "Canlı Piyasa Taraması & Eski Maliyet Tuzağı Koruması (Fırsat Kârı)",
        description:
          "Trendyol, Hepsiburada, Akakçe ve zincir marketler taranarak en düşük, medyan ve en yüksek piyasa fiyatları analiz edilir. Piyasa medyanı standart fiyattan %20 yüksekse sistem eski ucuza satma tuzağını önler, fiyatı piyasa medyanının %6 altına konumlandırarak '🔥 Fırsat Kârı Tespit Edildi' rozetiyle ekstra kâr yakalar.",
      },
      {
        type: "yeni",
        title: "Psikolojik Fiyat Yuvarlama Motoru (.90 Kuruş)",
        description:
          "Hesaplanan tüm perakende satış fiyatları otomatik olarak tam sayı ve sonu .90 kuruş olacak şekilde psikolojik raf standardına yuvarlanır (Örn: 168.15 ₺ -> 168.90 ₺).",
      },
      {
        type: "iyilestirme",
        title: "KDV Switch, Stok Menüsü ve Ürün Formu Entegrasyonu",
        description:
          "[KDV Hariç] / [KDV Dahil] anlık gösterim modu, /stok/fiyatlandirma sayfası, sol navigasyon menüsü ve ürün kartı formundaki '⚡ Akıllı Piyasa Fiyatı' butonu ile tek tıkla fiyat uygulama imkanı sağlandı.",
      },
    ],
  },
  {
    version: "2.4.69",
    date: "3 Ekim 2026",
    title: "Belge Önizlemede Kalem Kalem Ürün ve Miktar Detayları",
    badge: "Kalem Kalem Ürün & Miktar",
    items: [
      {
        type: "duzeltme",
        title: "Jenerik 'Ürün/Hizmet' İbaresi Kaldırıldı",
        description:
          "Belgeye tıklandığında sadece 'ürün/hizmet' veya tek satır çıkması sorunu tamamen giderildi. Alış ve satış belgelerinde hangi üründen kaç adet alındıysa veya satıldıysa o ürünün tam adı, miktarı (adet/koli/paket), birim fiyatı, KDV oranı ve tutarı kalem kalem listelendi.",
      },
      {
        type: "iyilestirme",
        title: "Yeni Belge ve Satış Kalemleri Senkronizasyonu",
        description:
          "Yeni alış veya satış belgesi kaydedildiğinde veya veritabanından sorgulandığında tüm satırlar (document_lines) eksiksiz taşınır; satır açıklamaları, miktarlar ve tutarlar hiçbir veri kaybı olmadan önizleme modalına aktarılır.",
      },
      {
        type: "yeni",
        title: "Alışlar ve Satışlar İçin Zengin Kalem Kalem Ürün Desteği",
        description:
          "Nitrik Asit, Payet Pul Kostik, Glanex Endüstriyel Bulaşık Deterjanı, Lento Contra, Klor, Aspirix, Kraft Çanta, Streç Film, Sıvı El Sabunu gibi tüm Ren Endüstriyel ürünleri ve miktarları her belgede açık ve şeffaf biçimde sunuldu.",
      },
    ],
  },
  {
    version: "2.4.68",
    date: "3 Ekim 2026",
    title: "Alışlar ve Satışlarda 1:1 'Belge Önizleme' Modalı ve Tema Uyumu",
    badge: "1:1 Önizleme & Tema Uyumu",
    items: [
      {
        type: "yeni",
        title: "1:1 Pusulam Belge Önizleme Modalı",
        description:
          "Alışlar ve Satışlar listesindeki herhangi bir belgeye tıklandığında birebir 'Belge Önizleme' penceresi açılır. Firma başlığı, belge türü (Alış Fişi / Satış Faturası), tarih, belge no, çerçeveli tedarikçi/müşteri kartı, kalemler tablosu (Açıklama, Miktar, Birim Fiyat, KDV, Tutar), Ara Toplam, KDV, Genel Toplam ve Ödeme Durumu birebir sunuldu.",
      },
      {
        type: "yeni",
        title: "Hızlı Aksiyonlar: WhatsApp, E-posta, Kopyala ve Yazdır / PDF",
        description:
          "Modal üst çubuğuna WhatsApp paylaşımı (#25D366), E-posta gönderme, tek tıkla pano kopyalama ve Pusulam teal (#00b49c) Yazdır/PDF butonları entegre edildi.",
      },
      {
        type: "iyilestirme",
        title: "Koyu & Açık Tema Tam Uyumu (Theme Compatibility)",
        description:
          "Belge önizleme modalı uygulamanın seçili temasına (Koyu / Açık / Sistem) %100 uyum sağlar; yazıcı çıktısında ise otomatik A4 beyaz kağıt moduna geçer.",
      },
    ],
  },
  {
    version: "2.4.67",
    date: "3 Ekim 2026",
    title: "Müşteri ve Tedarikçi Liste Tablosu Çerçeveye Tam Sığdırma (Responsive Table-Fixed)",
    badge: "Çerçeve & Ergonomi",
    items: [
      {
        type: "duzeltme",
        title: "Tablonun Sağ Tarafındaki Taşma Giderildi",
        description:
          "Masaüstü ve tablet ekranlarında tablonun kart çerçevesi dışına taşması engellendi. 'table-fixed' yapısı, esnek sütun yüzdeleri, metin kırpma (truncate) ve çerçeve içi (overflow-hidden) sınırlama ile tablonun sağ ve sol kenarlarla %100 hizalı kalması sağlandı.",
      },
      {
        type: "iyilestirme",
        title: "Toolbar ve Arama Alanı Duyarlı (Responsive) Yerleşim",
        description:
          "Arama kutusu, sıralama seçici, filtre butonları ve görünüm değiştirici butonların daha dar ekranlarda taşma yapmadan düzenli iki sıra halinde akması sağlandı.",
      },
    ],
  },
  {
    version: "2.4.66",
    date: "3 Ekim 2026",
    title: "Müşteriler ve Tedarikçiler İçin Liste Halinde Gösterim ve Çift Görünüm Desteği",
    badge: "Liste & Tablo Entegrasyonu",
    items: [
      {
        type: "yeni",
        title: "Müşteriler ve Tedarikçiler Tablo/Liste Görünümü (Dual View Mode)",
        description:
          "Müşteriler (/musteriler) ve Tedarikçiler (/tedarikciler) sayfalarına profesyonel Liste Görünümü eklendi. Cari unvanı, kodu, yetkilisi, telefon/e-posta bilgileri, il/ilçe konumu, VKN/TCKN, renkli durum rozetleriyle net bakiye ve hızlı işlem butonları tek bir tabloda sunuldu.",
      },
      {
        type: "yeni",
        title: "Liste & Kart Görünümü Arasında Anlık Geçiş ve Hafıza",
        description:
          "Toolbar'a 'Liste' ve 'Kart' görünüm değiştirme anahtarı eklendi. Kullanıcı tercihi yerel depolamada (localStorage) saklanarak sayfalar arasında korunur.",
      },
      {
        type: "iyilestirme",
        title: "Bakiye KPI Özeti, Hızlı Filtre Sekmeleri ve Sıralama",
        description:
          "Üst kısıma Toplam Cari, Tahsil Edilecek/Alacak, Ödenecek/Borç ve Net Durum KPI kartları eklendi. 'Tümü', 'Bakiyeliler', 'Borçlular' ve 'Alacaklılar' hızlı filtreleri ile unvan, bakiye ve şehir bazında sıralama entegre edildi.",
      },
      {
        type: "iyilestirme",
        title: "Hızlı WhatsApp ve Telefon Arama Aksiyonları",
        description:
          "Liste ve kartlarda kayıtlı telefon numaralarına tek tıkla doğrudan WhatsApp mesajı açma ve telefonla arama kısayolları eklendi.",
      },
    ],
  },
  {
    version: "2.4.65",
    date: "3 Ekim 2026",
    title: "Alışlar ve Satışlar '+' Butonu Cari Seçim Akışı (Tedarikçi & Müşteri) ve 1:1 Boş Durum",
    badge: "1:1 Akış & Ergonomi",
    items: [
      {
        type: "yeni",
        title: "Satışlar '+' Butonunda Müşteri Seçim Modalı (CustomerSelectModal)",
        description:
          "Satışlar sayfasında üstteki '+ Yeni Fatura' / '+ Yeni Sipariş' / '+ Yeni İrsaliye' ve sağ alttaki yüzen '+' (FAB) butonuna basıldığında 'Müşteri seç' modalı açılır. Müşteri seçildiğinde veya 'Müşterisiz devam' dendiğinde ilgili cari doğrudan seçilerek belge oluşturma ekranına aktarılır.",
      },
      {
        type: "iyilestirme",
        title: "Alışlar Sayfası 1:1 Boş Durum (Empty State)",
        description:
          "Alışlar sayfasında henüz kayıt olmadığında Pusulam'daki 1:1 sepet ikonu, 'Henüz alış belgesi yok' başlığı, 'Yeni alış belgesi oluşturun veya Gelen e-Fatura kutusundan aktarın' açıklaması ve '+ Yeni alış' (Tedarikçi modalını açar) ile 'Gelen e-Faturalar' butonları uygulandı.",
      },
      {
        type: "iyilestirme",
        title: "Alışlar ve Satışlar Yüzen Buton (FAB) Senkronizasyonu",
        description:
          "Alışlar'da sağ alttaki '+' yüzen butonu her zaman Tedarikçi Seçim modalını, Satışlar'da ise her zaman Müşteri Seçim modalını açacak şekilde 1:1 uyarlandı.",
      },
    ],
  },
  {
    version: "2.4.64",
    date: "3 Ekim 2026",
    title: "Pusulam 1:1 Katalog Ürünleri Seçim Ekranı",
    badge: "1:1 Arayüz & Özellik",
    items: [
      {
        type: "yeni",
        title: "Kataloğa Tıklayınca Açılan Ürün Seçim Modalı (1:1 Birebir)",
        description:
          "Katalog kartına tıklandığında '[Katalog Adı] - Ürünler' başlıklı modal açılır. Ürünler (Örn: ULTRA ÇAMAŞIR SUYU 5 KG, POŞET BEYAZ KÜÇÜK HESAPLI 600GR, vb.) onay kutuları (checkbox) ile listelenir. Seçilen ürünler katalogla ilişkilendirilerek ürün adedi rozeti dinamik güncellenir.",
      },
      {
        type: "yeni",
        title: "Modal İçi 'Paylaşım linki' ve 'Tamam' Aksiyonları",
        description:
          "Modalın sol altında '🔗 Paylaşım linki' butonu ile hızlı bağlantı yönetimi, sağ altında ise Pusulam teal (#00b49c) renginde 'Tamam' kaydetme butonu 1:1 birebir uygulandı.",
      },
    ],
  },
  {
    version: "2.4.63",
    date: "3 Ekim 2026",
    title: "Pusulam 1:1 Marka & Kategori Yönetimi ve Kataloglar Ekranları",
    badge: "1:1 Arayüz & Özellik",
    items: [
      {
        type: "yeni",
        title: "Marka & Kategori Yönetimi Ekranı (Birebir Tasarım)",
        description:
          "Sol tarafta 'Kategoriler' (kayıt sayısı, 'Yeni kategori adı' hızlı ekleme girişi, ürün adet rozetleri, düzenleme ve silme), sağ tarafta 'Markalar' (13 kayıt, 'Yeni marka adı' hızlı ekleme girişi, ASPEROX, AXOR, BİNGO, CİF PRO, DOMESTOS PRO, EFECTO, EFEX, FAMİLİA, FIFTY vb. özel kaydırılabilir liste) 1:1 side-by-side kart düzeniyle uygulandı.",
      },
      {
        type: "yeni",
        title: "Kataloglar Yönetimi Ekranı ve Paylaşım Modalı",
        description:
          "Üstte '+ Yeni Katalog' butonu, 'AKTİF KATALOGLAR' bölümü, yeşil kitap ikonlu 'Okul' katalog kartı ('0 ürün', 'Aktif' durum rozeti, silme butonu) ve '🔗 Link düzenle >' modalı ile doğrudan panoya kopyalama ve yeni sekmede açma özelliği entegre edildi.",
      },
      {
        type: "iyilestirme",
        title: "Pusulam Teal (#00b49c) Üst Sekmeler ve Alt Bilgi (Footer)",
        description:
          "Üstteki 'Ürünler', 'Marka & Kategori Yönetimi' ve 'Kataloglar' hap butonları seçili durumda Pusulam'ın özgün teal rengi (#00b49c) ile donatıldı; sayfa altında 'Biz Kimiz · Tanıtım ... powered by Numex AI' alt bilgi alanı eklendi.",
      },
    ],
  },
  {
    version: "2.4.62",
    date: "3 Ekim 2026",
    title: "Ürünü Düzenle Ekranı Genişletildi (Sola & Sağa Yaslama)",
    badge: "Tasarım & Ergonomi",
    items: [
      {
        type: "iyilestirme",
        title: "Geniş Ekran Modalı (w-[96vw] max-w-6xl xl:max-w-7xl)",
        description:
          "Ürünü düzenle modalı dar kutu görünümünden çıkarılarak ekranın soluna ve sağına doğru ferahça genişletildi (%96 viewport genişliği ve 1280px üst sınır).",
      },
      {
        type: "iyilestirme",
        title: "Duyarlı 4 Kolonlu Form Grid Düzeni",
        description:
          "Genişleyen alana uygun olarak ürün adı, stok kodu, barkod, kategori ve ana birim alanları 4 kolonlu akıcı grid düzenine uyarlandı; fiyatlandırma, stok ve alternatif birimler panelleri daha rahat ve ergonomik hale getirildi.",
      },
    ],
  },
  {
    version: "2.4.61",
    date: "3 Ekim 2026",
    title: "AppShell 'Rendered more hooks than during previous render' Hatası Düzeltildi",
    badge: "Kritik Çözüm",
    items: [
      {
        type: "duzeltme",
        title: "AppShell useLocalStorage Hook Çağrı Sırası Düzeltildi",
        description:
          "AppShell bileşeninde kimlik doğrulama yüklenirken (authLoading) dönen tam ekran yükleyici (FullScreenLoader) erken return koşulunun altında kalan useLocalStorage hook'u bileşenin en üstüne taşındı. Böylece sayfa geçişlerinde ve ilk yüklemede oluşan 'Rendered more hooks than during the previous render' hatası kalıcı olarak çözüldü.",
      },
    ],
  },
  {
    version: "2.4.60",
    date: "3 Ekim 2026",
    title: "Yerel Hata Giderme ve Kod Kararlılığı İyileştirmesi (6 Issue Düzeltildi)",
    badge: "Kararlılık & Hata Çözümü",
    items: [
      {
        type: "duzeltme",
        title: "React Hook Çağrı Sırası Hatası Giderildi",
        description:
          "Yeni Alış Belgesi modalındaki erken return koşulu useMemo hook'unun arkasına taşınarak React Rules of Hooks uyumluluğu sağlandı.",
      },
      {
        type: "duzeltme",
        title: "HTML / JSX Kaçış Karakteri ve Tip Güvenliği",
        description:
          "Alışlar yardım penceresindeki tırnak işaretleri standart HTML varlıklarıyla kaçırıldı, kullanılmayan kütüphane bağımlılıkları temizlendi.",
      },
      {
        type: "iyilestirme",
        title: "Stok ve Panel Hesaplama Alanları Optimize Edildi",
        description:
          "Panel istatistikleri ve grafik ipucu biçimlendiricisi tam tip güvenliğine kavuşturularak Next.js Turbopack derlemesi sıfır hata ile tamamlandı.",
      },
    ],
  },
  {
    version: "2.4.59",
    date: "3 Ekim 2026",
    title: "Anasayfa Finansal Sağlık Kokpiti & Kalın Çerçeveli İstatistikler (Genel Durum Modülü)",
    badge: "Genel Durum & Kâr/Zarar",
    items: [
      {
        type: "yeni",
        title: "Kâr/Zarar & Finansal Sağlık Kokpiti (Genel Durum Modülü)",
        description:
          "Alış, Satış, Tahsilat, Borç ve Depo Stok Varlığı'nı tek merkezde değerlendiren; 'Kârda mıyız, Zararda mıyız?' cevabını netleştiren, 100 puanlık sağlık skoru ve kâr marjı modülü eklendi.",
      },
      {
        type: "yeni",
        title: "3 Fazlı Zaman Yolculuğu Göstergesi (Önce / Şimdi / İleriye Dönük Projeksiyon)",
        description:
          "Geçmiş dönem performansı ('Önce Nasıldık?'), anlık gerçekleşen likidite ve kâr ('Şu An Nasılsız?') ve gelecek 30 günlük beklenen tahsilat/ödeme farkı ile yükseliş trendini gösteren ibre ('İleride Ne Görünüyor?') entegre edildi.",
      },
      {
        type: "iyilestirme",
        title: "Belirgin Kalın Çerçeveli İstatistik Kartları",
        description:
          "Anasayfadaki tüm metrik, ciro, nakit/banka ve stok kartları yüksek kontrastlı kalın çerçeveler (border-2 / border-[2.5px]) ile çok daha vurucu ve belirgin hale getirildi.",
      },
    ],
  },
  {
    version: "2.4.58",
    date: "3 Ekim 2026",
    title: "Tedarikçi Seç Modalı & Yeni Alış Belgesi (Foto 1, 2, 3 Birebir Entegrasyon)",
    badge: "1:1 Alışlar & Fatura",
    items: [
      {
        type: "yeni",
        title: "Tedarikçi Seç Pop-up Modalı (Foto 1)",
        description:
          "Yeni alış butonuna basıldığında açılan, hızlı arama, alfabetik baş harfli logolar ve 'Tedarikçisiz devam' seçeneği içeren birebir modal entegre edildi.",
      },
      {
        type: "yeni",
        title: "Yeni Alış Belgesi Birleşik Ekranı (Foto 2 & 3)",
        description:
          "Tedarikçi, Belge Türü, Tarih, Belge No, Fatura Tipi, Para Birimi alanları, Ürün/Hizmetler hızlı arama şeridi, Kalemler tablosu, fatura altı iskonto butonu, stopaj seçimi, Ödeme Durumu (Ödendi Peşin / Açık Vadeli) ve Kasa seçimi eksiksiz bağlandı.",
      },
      {
        type: "iyilestirme",
        title: "Alışlar Listesi Düzeni ve Kart Hizalamaları",
        description:
          "Alışlar tablosu önceki ekran görüntüsündeki 6'lı buton grubu, durum rozetleri, vade ve gecikme uyarıları ile pürüzsüz ve karışıklıktan arındırılmış hale getirildi.",
      },
    ],
  },
  {
    version: "2.2.5",
    date: "2 Ekim 2026",
    title: "1:1 Pusulam Genel Bakış (Panel) Düzeni & 23 Modül Grid Eşitlemesi",
    badge: "1:1 Panel & Modüller",
    items: [
      {
        type: "yeni",
        title: "Pusulam Canlı HTML'i ile Birebir Genel Bakış (Dashboard) Düzeni",
        description:
          "Pusulam'dan kopyalanan DOM yapısına uygun olarak 5 gradient KPI kartı (Amber, Rose, Blue, Emerald, Brand Teal), 3 periyotlu Satış Grafiği, En Çok Satan Ürünler kartı ve Döviz Özeti kutusu 1:1 entegre edildi.",
      },
      {
        type: "yeni",
        title: "23 Adet Pusulam Modül Kutusunun Tamamı Eklendi",
        description:
          "Panelin alt kısmına Numex/REN AI, Hızlı Satış, Ürünler, Alışlar, Satışlar, Masraflar, e-Fatura, Şubeler, Stoklar, Müşteriler, Tedarikçiler, Teklifler, Çek & Senet, Hesaplar, Banka Ekstresi, Kampanya, Hatırlatmalar, Raporlar, Ajanda, E-Ticaret, Çalışanlar & Ekip, Akademi ve Muhasebeci Ağı modül kartları ikonlarıyla yerleştirildi.",
      },
      {
        type: "iyilestirme",
        title: "Pusulam İmza Teal (#0f9b8e) Renk ve Grafik Teması Eşitlendi",
        description:
          "Tailwind brand renk skalası Pusulam'ın orijinal #0f9b8e tonuna kalibre edildi; Satış Grafiği alan gradyanı ve çizgisi #0f9b8e ile uyarlandı.",
      },
    ],
  },
  {
    version: "2.2.4",
    date: "2 Ekim 2026",
    title: "Hızlı Satış Seçili Ürün Beyazlık Düzeltmesi & 1:1 Pusulam Koyu Slate Terminal Teması",
    badge: "1:1 Görsel Düzeltme & Kontrast",
    items: [
      {
        type: "duzeltme",
        title: "Sepette Seçili Ürünün Beyaz Görünmesi ve Okunamaması Sorunu Giderildi",
        description:
          "Sepette ürün satırına tıklandığında oluşan parlak beyaz zemin (#f0fdfa) ve beyaz metin çakışması tamamen ortadan kaldırıldı; Pusulam ile birebir uyumlu koyu zümrüt/teal (#0e3b43) seçim vurgusu ve net beyaz tipografi uygulandı.",
      },
      {
        type: "iyilestirme",
        title: "Pusulam Canlı Arayüzü ile 1:1 Renk, Buton ve Kutu Eşitlemesi",
        description:
          "Arka plan rengi (#0b171e), üst bar, 12 sütunlu miktar/çarpan (2x, 4x, 6x, +), barkod arama kutusu ve sağdaki hızlı ürünler paneli Pusulam ekran görüntüsü ile piksel seviyesinde birebir eşitlendi.",
      },
      {
        type: "iyilestirme",
        title: "Üst Gezinme Çubuğu (Topbar) POS Ekranına Entegre Edildi",
        description:
          "Pusulam'daki gibi şirket/mağaza seçicisi, genel arama ve profil alanını içeren üst çubuk terminalin üzerinde kalacak şekilde düzenlendi.",
      },
    ],
  },
  {
    version: "2.2.3",
    date: "2 Ekim 2026",
    title: "Pusulam ERP Birebir (1:1) Hızlı Satış (POS) Terminali Entegrasyonu",
    badge: "1:1 Pusulam POS Terminali",
    items: [
      {
        type: "yeni",
        title: "Pusulam ERP ile %100 Birebir Görsel ve Fonksiyonel Tasarım",
        description:
          "Pusulam POS kaynak kodları ve arayüz yapısı tersine mühendislikle çözümlenerek; birebir Klasik (Teal) ve Modern (Slate) tema desteği, tam ekran kiosk modu, canlı ses efektleri (Barkod, Onay, Hata bip sesleri) ve F1-F12 kısayol çubuğu entegre edildi.",
      },
      {
        type: "yeni",
        title: "Gelişmiş Terminal Başlığı ve Alt İşlem Çubuğu",
        description:
          "Kasa bakiyesi gizleme/gösterme göz butonu, çevrim içi durumu, vardiya yönetimi, Z raporu, iade modu (kırmızı şeritli stok iadesi), son satışı geri alma (↩ Geri Al), barkod etiket basımı, kiosk fiyat sorgulama ve toptan/perakende (2. Fiyat) geçişi eklendi.",
      },
      {
        type: "iyilestirme",
        title: "12 Sütunlu Hızlı Barkod ve Miktar Giriş Alanı",
        description:
          "F3 Miktar artır/azalt ve hızlı çarpan butonları (2×, 3×, 4×, 5×), F4 Barkod/Ürün adı anlık arama açılır kutusu, F2 ürün seçici, kamera okuyucu ve tek tuşla iptal alanı Pusulam düzenine göre konumlandırıldı.",
      },
      {
        type: "iyilestirme",
        title: "Klavye Odaklı Sepet Tablosu ve Akıllı Para Üstü Merkezi",
        description:
          "Sepette Yukarı/Aşağı ok tuşları ile gezinme, satır içi anlık fiyat düzenleme, F5 Ödenen tutar girişi, devasa Para Üstü kutusu ve hızlı Türk Lirası banknot butonları (Tam, ₺20, ₺50, ₺100, ₺200, ₺500, ₺1000) ile sıfır gecikmeli kasa deneyimi sağlandı.",
      },
      {
        type: "yeni",
        title: "Boyutlandırılabilir Hızlı Ürünler Paneli ve Pusulam Modalları",
        description:
          "Kategori sekmeleri, 'Düzenle/Bitti' hızlı buton yönetimi, Stoksuz Ürün Satışı, Müşteri Seçimi (F8), Karma Ödeme (F10), İskonto/İndirim (F11/F12) ve Eski Fişler modalları Pusulam ile birebir eşleştirildi.",
      },
    ],
  },
  {
    version: "2.2.2",
    date: "2 Ekim 2026",
    title: "Hızlı Satış & Satış Faturalarının Gün, Ay, Yıl Periyotlarına Tam Dahil Edilmesi",
    badge: "Satış & Ciro Entegrasyonu",
    items: [
      {
        type: "duzeltme",
        title: "Hızlı Satışlar (pos_sale) ve Faturalar Günlük, Haftalık, Aylık ve Yıllık Raporlara Dahil Edildi",
        description:
          "Raporlar ve kontrol panelinde yalnızca 'pos' arandığı için eksik kalan hızlı satışlar ('pos_sale') tüm satış faturası toplamları, ciro grafikleri, kârlılık tabloları ve en çok satanlar listesine eksiksiz dahil edildi.",
      },
      {
        type: "yeni",
        title: "Kontrol Paneli Dönem Özeti: Günlük, Haftalık, Aylık ve Yıllık Karşılaştırma",
        description:
          "Dönem özetinde 'Bu Yıl' desteği eklendi. Gün (Bugün vs Dün), Hafta (Bu Hafta vs Geçen Hafta), Ay (Bu Ay vs Geçen Ay) ve Yıl (Bu Yıl vs Geçen Yıl) bazında dinamik sparkline barları ve sepet ortalamasıyla gerçek zamanlı hesaplama sağlandı.",
      },
      {
        type: "iyilestirme",
        title: "Raporlar Çalışma Alanına Yıllık Dönem Seçeneği & Saatlik POS Analizi Eklendi",
        description:
          "Raporlar sayfasında yıllık (Son 5 Yıl) analiz sekmesi aktif edildi; bugün yapılan hızlı satışların saatlik dökümü gerçek işlem saatlerine göre dinamik olarak hesaplanıp grafikleştirildi.",
      },
    ],
  },
  {
    version: "2.2.1",
    date: "2 Ekim 2026",
    title: "Kasa/Banka Hızlı Para Giriş-Çıkışı Düzeltmesi & Pusulam Canlı Tasarım Entegrasyonu",
    badge: "Canlı Düzeltme & Tasarım",
    items: [
      {
        type: "duzeltme",
        title: "Kasa & Banka Hızlı Para Girişi/Çıkışı (transactions_type_check) Hatası Düzeltildi",
        description:
          "Hesaplar ekranındaki hızlı para girişi ve çıkışı işlemlerinde veritabanı kısıtlamasına takılan türler 'other_income' ve 'other_expense' olarak standartlaştırıldı; anlık bakiye senkronizasyonu sağlandı.",
      },
      {
        type: "duzeltme",
        title: "Hesaplar Arası Virman / Transfer İşlemi Güçlendirildi",
        description:
          "İki hesap arasındaki para aktarımı tekil atomik virman kaydı ile veritabanı trigger mekanizmasına tam uyumlu hale getirildi.",
      },
      {
        type: "yeni",
        title: "Pusulam Birebir Renkli Metrik Çerçeveleri & Belirgin Kutu Tasarımı",
        description:
          "Ürün detay ve yönetim ekranlarında Pusulam'ın orijinal zümrüt yeşili, kehribar ve mavi gradient kartları ile tüm liste ve form kutularında belirgin çerçeve hatları devreye alındı.",
      },
    ],
  },
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
