# E-Fatura (arşiv)

E-Fatura / E-Arşiv modülü 6 Ekim 2026'da kullanıcı kararıyla uygulamadan kaldırıldı.
Kod silinmedi, buraya taşındı. Derlemeye dahil değildir (tsconfig `exclude: arsiv`).

- `sayfalar/` → eski `src/app/(app)/e-fatura/` (gelen/giden/oluştur/kdv-raporu)
  - `sayfalar/gelen/page.tsx` yarım kalmış (derlenmeyen) değişikliği de içerir.
- `components/e-invoice/` → eski `src/components/e-invoice/`
- `lib/e-invoice.ts` → eski `src/lib/e-invoice.ts`

Veritabanındaki e-fatura kayıtlarına dokunulmadı. Geri açmak için dosyaları eski yerlerine taşıyıp
`src/lib/nav.ts` menü grubunu ve `next.config.ts` yönlendirmesini geri almak yeterli.
