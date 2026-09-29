-- Migration: Alış fiyatlarının KDV hariç olarak normalize edilmesi
-- Kullanıcı İsteği: Alış faturaları ile girilen tüm ürünlerin birim fiyatlarının KDV hariç olarak düzenlenmesi

update public.products
   set purchase_price_includes_vat = false,
       updated_at = now()
 where purchase_price_includes_vat = true;
