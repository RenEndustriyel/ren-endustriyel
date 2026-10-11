# Ren Endüstriyel · Ön Muhasebe

Satış, alış, cari, stok, nakit ve çek-senet takibi için çok firmalı (multi-tenant) PWA.

- **Önyüz:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Radix UI · Recharts
- **Veri:** Supabase (Postgres + RLS, Auth, Storage)
- **Çevrimdışı:** Service worker (`public/sw.js`) + TanStack Query önbelleği (IndexedDB)
- Plan ve fazlar: [`PLAN.md`](PLAN.md)

## Modüller

| Menü | İçerik |
|---|---|
| Güncel Durum | KPI kartları, tahsilat/ödeme halkaları, vade takvimi, 12 hafta nakit akışı, satış grafiği |
| Satışlar | Teklif → sipariş → irsaliye → fatura, iade, hızlı satış (POS, barkod), müşteriler |
| Giderler | Alış faturası, masraf (fiş fotoğrafı), satın alma siparişi, gelen irsaliye, iade, tedarikçiler, çalışanlar/maaş |
| Nakit | Kasa/banka/kredi kartı, tahsilat/ödeme (belge eşleştirme), virman, çek & senet, banka ekstresi içe aktarma |
| Stok | Ürün/hizmet (alternatif birim, fiyat listesi), depolar, transfer, sayım, stok geçmişi |
| Raporlar | Gelir-gider/kârlılık, KDV, nakit akışı, satış analizi, cari bakiye/yaşlandırma, stok |
| Ajanda | Takvim, hatırlatma/etkinlik/not, vadesi gelen belgeler ve çekler |
| Ayarlar | Firma + logo, belge numaraları, birim/depo, kategoriler, kullanıcılar/davet, bildirim, döviz kuru |

PDF (fatura, teklif, irsaliye, ekstre) tarayıcıda üretilir; telefonda paylaşım menüsüyle WhatsApp'a gönderilebilir.

## Geliştirme

```bash
cp .env.example .env.local   # Supabase URL ve publishable key
npm install
npm run dev                  # http://localhost:3000
npm run lint && npx tsc --noEmit
npm run build                # service worker yalnızca production build'de kaydolur
```

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<proje-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key |

Vercel'de aynı iki değişkeni Project → Settings → Environment Variables altına ekleyin.

## Veritabanı

Şema `supabase/migrations/` altındadır ve sırayla uygulanır:

| Dosya | İçerik |
|---|---|
| `…001_core` | firmalar, üyelik/rol, profiller, davetler, yetki fonksiyonları |
| `…002_master_data` | birimler, kategoriler, depolar, fiyat listeleri, cariler, ürünler, depo stokları |
| `…003_documents_stock` | çalışanlar, numara serileri, belgeler + satırlar, stok hareketleri, transferler |
| `…004_cash` | kasa/banka/kredi kartı, para hareketleri, kısmi tahsilat eşleştirmesi, çek & senet |
| `…005_misc` | ajanda, ekler, TCMB kurları, banka ekstresi, push abonelikleri, işlem geçmişi, dosya deposu |
| `…006_functions` | firma kurulumu, `save_document`, `save_transaction`, cari bakiyeleri, `dashboard_summary` |
| `…007`–`009` | doğrulanmış e-posta ile davet kabulü, fonksiyon yetkileri, RLS performansı |

Yeni bir projeye uygulamak için: `npx supabase link --project-ref <ref>` ve `npx supabase db push`.

### Temel kurallar

- Her tabloda `org_id` vardır; erişim RLS ile `memberships` üzerinden kontrol edilir.
- Roller: **owner**, **admin** (her şey), **staff** (kayıt girer; ayarlar/kullanıcılar kapalı), **accountant** (salt okunur).
- Belge tutarları, stok hareketleri ve numaralar sunucuda `save_document()` içinde tek işlemde hesaplanır; istemci yalnızca satırları gönderir.
- Kayıt kimlikleri istemcide üretilebilir ve RPC'ler idempotenttir (çevrimdışı senkron için).
- Silme işlemleri `deleted_at` ile yumuşak silmedir.

## Supabase Auth ayarları

Authentication → URL Configuration:
- **Site URL:** Vercel adresi (örn. `https://ren-muhasebe.vercel.app`)
- **Redirect URLs:** `https://<vercel-adresi>/**` ve geliştirme için `http://localhost:3000/**`

E-posta doğrulaması açıktır. Davet edilen kişi davet e-postasıyla kayıt olup adresini doğruladığında firmaya otomatik eklenir.

## Edge Functions ve zamanlanmış görevler

| Fonksiyon | Görev | Zamanlama (pg_cron) |
|---|---|---|
| `fetch-rates` | TCMB `today.xml` → `exchange_rates` | hafta içi 10:00 ve 15:45 (TR) + Ayarlar'dan elle |
| `send-reminders` | Zamanı gelen hatırlatmaları web push ile gönderir | 10 dakikada bir |
| `send-reminders` `{digest:true}` | Günlük özet (bugün vadesi gelen / geciken) | her gün 08:30 (TR) |

Dağıtım: `SUPABASE_ACCESS_TOKEN=… npx supabase functions deploy <ad> --project-ref <ref> --use-api --no-verify-jwt`

Fonksiyon gizli değerleri (Supabase → Edge Functions → Secrets): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
`CRON_SECRET` aynı zamanda Vault'ta `cron_secret` adıyla tutulur (pg_cron çağrıları için). VAPID açık anahtarı `src/lib/push.ts` içindedir.

## Çevrimdışı çalışma

- `npm run build` öncesinde `scripts/gen-sw.mjs` çalışır ve tüm sayfaları içeren `public/sw.js` dosyasını üretir.
- Veriler TanStack Query önbelleğinde (IndexedDB) saklanır; sık kullanılan listeler açılışta önceden yüklenir.
- Çevrimdışı yapılan kayıtlar kuyruğa alınır ve bağlantı gelince sırayla gönderilir; üst çubukta bekleyen sayısı görünür.
- Belge numarası çevrimdışıyken boş kalır, senkronda sunucu verir.

## İkonlar

`scripts/logo-source.webp` değiştiğinde: `node scripts/make-icons.mjs`
