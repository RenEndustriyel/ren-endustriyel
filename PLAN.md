# Ren Ön Muhasebe — Proje Planı

Referanslar: Paraşüt "Güncel Durum" + Pusulam "Panel" ekranları.
Hedef: Önce Ren Endüstriyel için, altyapı baştan çok firmalı (SaaS) olacak şekilde.

## 1. Teknoloji

| Katman | Seçim |
|---|---|
| Frontend | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS 4 + Radix UI (shadcn tarzı kendi bileşenlerimiz), lucide ikonlar, Recharts grafikler |
| Veritabanı / Auth / Dosya | Supabase (Postgres + RLS, Auth: e-posta+şifre, Storage) |
| Offline | PWA (özel service worker `public/sw.js`) + TanStack Query önbelleği IndexedDB'de + senkron kuyruğu |
| PDF | @react-pdf/renderer (fatura, teklif, irsaliye, ekstre) |
| Excel | SheetJS (içe/dışa aktarma) |
| Barkod | Kamera ile okuma (BarcodeDetector API, yoksa ZXing) |
| Push | Web Push (VAPID) + Supabase Edge Function + pg_cron |
| Hosting | Vercel |
| Kur | TCMB günlük kur (Edge Function + cron) |

## 2. Tasarım

- Pusulam görünümü: açık/modern kartlar, renkli KPI kutuları, karanlık mod, Ctrl+K komut paleti.
- Paraşüt'ten alınanlar: tahsilat/ödeme halkaları (toplam / gecikmiş / planlanmamış), sağda vade zaman çizelgesi, 12 haftalık nakit akışı grafiği, KDV kartı.
- Responsive: masaüstünde sol menü, tablette daraltılabilir menü, telefonda alt sekme çubuğu (Panel · Satış · Müşteriler · Ürünler · Menü) + ortada hızlı işlem butonu.
- Tüm tutarlar `tr-TR` biçiminde (1.234,56 ₺).

## 3. Çok firmalı (multi-tenant) altyapı

- `organizations` (firma) → her veri satırında `org_id`.
- `memberships (user_id, org_id, role)` — bir kullanıcı birden çok firmada olabilir; üst çubukta firma değiştirici.
- Roller: **owner** (sahip), **admin** (yönetici), **staff** (personel: kasa/banka bakiyeleri, raporlar ve ayarlar kapalı), **accountant** (muhasebeci: salt okunur + rapor/dışa aktarma).
- Güvenlik tamamen Postgres RLS ile: `is_member(org_id)` / `has_role(org_id, roles[])` fonksiyonları.
- Davet: e-posta ile firmaya kullanıcı davet etme.
- Kritik işlemler (fatura kesme, tahsilat, stok hareketi) Postgres fonksiyonlarında (RPC) tek transaction'da yapılır — bakiyeler tutarlı kalır.

## 4. Modüller (ilk sürüm)

### Panel (Güncel Durum)
KPI kartları (aylık ciro, masraf, bugünkü tahsilat, kasa/banka, açık alacak), tahsilat & ödeme halkaları, vade zaman çizelgesi (yaklaşan/geciken), satış grafiği (günlük/aylık), en çok satanlar, döviz özeti, alacak/borç/net durum, son hareketler, kritik stok, bu ay/geçen ay KDV, 12 hafta nakit akışı.

### Satışlar
- Teklif → tek tıkla Sipariş/Fatura'ya çevirme
- Sipariş → İrsaliye → Fatura
- Satış faturası: satır bazında KDV (%0/1/10/20), KDV dahil/hariç fiyat, satır + genel iskonto, döviz (USD/EUR, belge kuru), vade
- Hızlı Satış (POS): barkod/ürün arama, sepet, anında tahsilat (nakit/kart/havale)
- Satış iadesi
- Otomatik numara: `önek + yıl + sıra` (örn. REN2026000001), belge türüne göre ayarlanabilir

### Alışlar / Giderler
- Alış faturası (stok girişi yapar), masraf (kategori + fiş fotoğrafı), alış iadesi
- Çalışanlar: personel kartı, maaş/avans/prim ödemeleri

### Cariler (Müşteri + Tedarikçi tek kartta)
- Cari tipi: müşteri / tedarikçi / her ikisi; VKN/TCKN, vergi dairesi, adres, yetkili, etiket
- Açılış bakiyesi, cari ekstre, bakiye yaşlandırma
- Vade + gecikme takibi, kısmi tahsilat/ödeme (bir belgeye birden fazla ödeme; bir ödemeyi birden fazla belgeye dağıtma)
- Ekstre/fatura PDF → paylaş (WhatsApp / e-posta, Web Share API)

### Stok
- Ürün/hizmet, kategori, barkod, çoklu birim (adet/kg/koli, dönüşüm oranı)
- Çoklu depo, depolar arası transfer, stok sayımı, stok geçmişi
- Fiyat listeleri (bayi/perakende), müşteriye özel fiyat listesi
- Ağırlıklı ortalama maliyet → ürün bazında kâr
- Kritik stok seviyesi uyarısı

### Nakit
- Hesaplar: kasa, banka, kredi kartı (TL/USD/EUR)
- Virman, banka ekstresi içe aktarma (Excel/CSV → hareketlerle eşleştirme)
- Çek & Senet: alınan/verilen portföy, durum (portföyde, ciro edildi, tahsil edildi, karşılıksız…), vade takibi

### Hatırlatmalar & Ajanda
Vade/çek/ödeme hatırlatmaları, takvim görünümü, notlar; PWA push bildirimi.

### Raporlar (Excel/PDF dışa aktarma)
KDV raporu, gelir-gider & kârlılık (aylık, kategori, ürün), 12 hafta nakit akışı, satış/tahsilat/ödeme raporları, kasa/banka raporu, stok raporu, cari bakiye listesi.

### Ayarlar
Firma bilgileri + logo, belge numara serileri, kategoriler/etiketler, birimler, depolar, kullanıcılar & davet, PDF şablonu (logo/renk/alt not), döviz kuru (TCMB otomatik / elle).

### İçe aktarma
Excel şablonları: cariler (açılış bakiyeli), ürünler (açılış stoklu), hesap açılış bakiyeleri.

## 5. Veri modeli (özet)

```
organizations, memberships, invitations, profiles
number_series
contacts (cari), contact_addresses
categories, tags
units, products, product_units, price_lists, price_list_items
warehouses, stock_movements, stock_transfers, stock_counts
documents  (tip: quote, order, sales_invoice, purchase_invoice, delivery_note_out/in,
            sales_return, purchase_return, expense, pos_sale)
document_lines
accounts   (cash, bank, credit_card; currency)
transactions (tahsilat, ödeme, virman, maaş, açılış…)
payment_allocations (ödeme ↔ belge eşleşmesi, kısmi tahsilat)
cheques (çek/senet) + cheque_events
employees, payroll_items
reminders, calendar_events
attachments (Storage)
exchange_rates
bank_statement_imports, bank_statement_lines
push_subscriptions
audit_log (altyapı; arayüz sonra)
```
Tutarlar `numeric(18,2)`, kurlar `numeric(18,6)`; her kayıtta `org_id`, `created_by`, `created_at`, `updated_at`, `deleted_at` (soft delete — offline senkron için gerekli).

## 6. Offline + senkron stratejisi

Tam offline istendi. Muhasebede çakışma riskli olduğu için şu kurallar:
- Kayıt ID'leri istemcide üretilir (UUID v7) → offline oluşturulan kayıt aynı ID ile sunucuya gider.
- Okuma: listeler IndexedDB'ye önbelleklenir, `updated_at` ile artımlı çekilir.
- Yazma: işlemler "outbox" kuyruğuna yazılır, internet gelince sırayla RPC'lere gönderilir (idempotent).
- **Belge numarası** offline iken geçici ("TASLAK-…") verilir, senkronda sunucu kesin numarayı atar.
- Stok/bakiye her zaman sunucuda hesaplanır; offline ekranlarda "tahmini" olarak gösterilir.
- Çakışma: son yazan kazanır + çakışma kaydı; fatura gibi kesinleşmiş belgelerde sunucu reddederse kullanıcıya gösterilir.
- Uygulandı: TanStack Query önbelleği + duraklatılmış mutasyonlar IndexedDB'de saklanır; üst çubukta bekleyen değişiklik sayısı görünür.

## 7. Fazlar

1. ✅ **Temel**: Next.js iskelet, PWA, tasarım sistemi, layout (menü/alt bar/Ctrl+K/karanlık mod), Supabase şema + RLS + auth, firma oluşturma, ayarlar.
2. ✅ **Cariler + Ürünler/Stok + Depolar**: cari kartı ve ekstre, ürün (alternatif birim, barkod, açılış stoğu), depolar, transfer, sayım, stok geçmişi, fiyat listeleri, Excel içe aktarma.
3. ✅ **Satış/Alış belgeleri**: teklif, sipariş, irsaliye, fatura, iade, dönüştürme/kopyalama, hızlı satış (POS), PDF + paylaşım.
4. ✅ **Nakit**: kasa/banka/kredi kartı, tahsilat/ödeme + belge eşleştirme, virman, çek-senet, masraf (fiş fotoğrafı), çalışanlar/maaş, banka ekstresi.
5. ✅ **Raporlar**: gelir-gider/kârlılık, KDV, nakit akışı, satış analizi, cari bakiye/yaşlandırma, stok — Excel dışa aktarma.
6. ✅ **Ajanda + Push + Kur**: takvim, hatırlatma, web push, günlük özet, TCMB kurları (Edge Function + pg_cron).
7. ✅ **Çevrimdışı**: tüm sayfalar service worker ile önbellekte, veriler IndexedDB'de, çevrimdışı kayıtlar kuyrukta ve bağlantı gelince sırayla gönderiliyor.
8. Sonrası: e-Fatura/e-Arşiv entegratörü, işlem geçmişi (audit log) arayüzü, çoklu firma için abonelik/kayıt akışı.

Kapsam dışı (şimdilik): e-Belge, AI asistan, e-ticaret/pazaryeri, şubeler, tevkifat, stopaj/ÖTV.

## 8. Kararlar

- Supabase projesi: `araetdkscwosdbwdemlk` (Frankfurt). Tüm şema, RLS, tetikleyiciler ve iş fonksiyonları kurulu.
- Uygulama adı: Ren Endüstriyel · ana renk Paraşüt paleti (mavi `#1ba2d0`, mercan, yeşil), logo `scripts/logo-source.webp`.
- Firma: Ren Endüstriyel · VKN 21856457480 · Susurluk V.D. · Han Mah. Yeni Cadde No: 23/D Susurluk/Balıkesir.
- Varsayılan KDV %20 · birimler: adet, kilo, gram, litre, paket, koli, bidon · depo: Merkez Depo · kasa: Merkez Kasa.
- Çek/senette ciro/teminat yok (portföy → tahsile verildi → tahsil edildi / karşılıksız / iade).
- Grafik renkleri: giriş `#1590bb` / çıkış `#c9731f` (koyu temada `#1f98c4` / `#d27a2c`), renk körlüğü için doğrulandı.
- Hosting: kullanıcının Vercel hesabı.
