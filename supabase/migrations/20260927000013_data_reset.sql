-- =====================================================================
-- 013 · Veri Sıfırlama Yardımcısı (Firma Verilerini Temizleme)
-- =====================================================================

create or replace function public.reset_organization_data(
  p_org  uuid,
  p_mode text -- 'commercial_stock', 'all_movements', 'factory_reset'
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_default_wh uuid;
  v_default_acc uuid;
begin
  if not public.is_admin(p_org) then
    raise exception 'Veri sıfırlama işlemi için firma yöneticisi yetkisi gereklidir';
  end if;

  if p_mode not in ('commercial_stock', 'all_movements', 'factory_reset') then
    raise exception 'Geçersiz sıfırlama modu: %', p_mode;
  end if;

  -- 1. Ticari & Stok Hareketleri
  if p_mode in ('commercial_stock', 'all_movements', 'factory_reset') then
    -- Eşleştirmeler
    delete from public.payment_allocations
     where document_id in (select id from public.documents where org_id = p_org);

    -- Stok hareketleri ve transferleri
    delete from public.stock_movements where org_id = p_org;
    delete from public.stock_transfers where org_id = p_org;

    -- Belge satırları ve belgeler
    if p_mode = 'commercial_stock' then
      delete from public.document_lines
       where document_id in (
         select id from public.documents
          where org_id = p_org
            and doc_type in ('quote','sales_order','sales_delivery','sales_invoice','sales_return','pos_sale','purchase_order','purchase_delivery','purchase_invoice','purchase_return')
       );
      update public.documents set source_document_id = null
       where org_id = p_org
         and doc_type in ('quote','sales_order','sales_delivery','sales_invoice','sales_return','pos_sale','purchase_order','purchase_delivery','purchase_invoice','purchase_return');
      delete from public.documents
       where org_id = p_org
         and doc_type in ('quote','sales_order','sales_delivery','sales_invoice','sales_return','pos_sale','purchase_order','purchase_delivery','purchase_invoice','purchase_return');
    else
      delete from public.document_lines where org_id = p_org;
      update public.documents set source_document_id = null where org_id = p_org;
      delete from public.documents where org_id = p_org;
    end if;

    -- Ürün stok miktarlarını sıfırla
    update public.product_stocks set quantity = 0 where org_id = p_org;
    update public.products set stock_qty = 0, avg_cost = 0 where org_id = p_org;

    -- Numara serilerini sıfırla
    if p_mode = 'commercial_stock' then
      update public.number_series set next_number = 1
       where org_id = p_org
         and doc_type in ('quote','sales_order','sales_delivery','sales_invoice','sales_return','pos_sale','purchase_order','purchase_delivery','purchase_invoice','purchase_return','stock_transfer');
    end if;
  end if;

  -- 2. Kasa, Banka ve Çek Hareketleri
  if p_mode in ('all_movements', 'factory_reset') then
    delete from public.cheque_events where org_id = p_org;
    delete from public.cheques where org_id = p_org;
    delete from public.bank_statement_lines where org_id = p_org;
    delete from public.bank_statement_imports where org_id = p_org;
    delete from public.transactions where org_id = p_org;
    delete from public.reminders where org_id = p_org;

    -- Kasa ve banka hesap bakiyelerini sıfırla
    update public.accounts set balance = 0 where org_id = p_org;
    update public.number_series set next_number = 1 where org_id = p_org;
  end if;

  -- 3. Fabrika Ayarları (Tüm Kartlar & Tanımlar)
  if p_mode = 'factory_reset' then
    delete from public.product_units where org_id = p_org;
    delete from public.price_list_items where org_id = p_org;
    delete from public.product_stocks where org_id = p_org;
    delete from public.products where org_id = p_org;
    delete from public.contacts where org_id = p_org;
    delete from public.employees where org_id = p_org;
    delete from public.attachments where org_id = p_org;
    delete from public.audit_log where org_id = p_org;

    -- Depolar: Varsayılan "Merkez Depo" hariç sil
    select id into v_default_wh from public.warehouses where org_id = p_org and is_default limit 1;
    if v_default_wh is not null then
      delete from public.warehouses where org_id = p_org and id <> v_default_wh;
      update public.warehouses set name = 'Merkez Depo' where id = v_default_wh;
    else
      delete from public.warehouses where org_id = p_org;
      insert into public.warehouses (org_id, name, is_default) values (p_org, 'Merkez Depo', true);
    end if;

    -- Kasalar: Varsayılan "Merkez Kasa" hariç sil
    select id into v_default_acc from public.accounts where org_id = p_org and type = 'cash' limit 1;
    if v_default_acc is not null then
      delete from public.accounts where org_id = p_org and id <> v_default_acc;
      update public.accounts set name = 'Merkez Kasa', balance = 0, currency = 'TRY', is_active = true where id = v_default_acc;
    else
      delete from public.accounts where org_id = p_org;
      insert into public.accounts (org_id, type, name, currency, sort_order) values (p_org, 'cash', 'Merkez Kasa', 'TRY', 1);
    end if;

    -- Fiyat listeleri
    delete from public.price_lists where org_id = p_org;
    insert into public.price_lists (org_id, name, is_default) values
      (p_org, 'Perakende', true),
      (p_org, 'Bayi', false);

    -- Kategorileri varsayılana getir
    delete from public.categories where org_id = p_org;
    insert into public.categories (org_id, type, name, color, sort_order)
    select p_org, 'expense', n, c, o from (values
      ('Kira', '#ef7565', 1), ('Elektrik', '#f5a623', 2), ('Su', '#1fa3d1', 3),
      ('Doğalgaz', '#8b6a55', 4), ('İnternet / Telefon', '#6c5ce7', 5), ('Akaryakıt', '#e17055', 6),
      ('Yemek', '#00b894', 7), ('Kargo / Nakliye', '#0984e3', 8), ('Kırtasiye / Ofis', '#636e72', 9),
      ('Vergi / SGK', '#d63031', 10), ('Maaş', '#2d3436', 11), ('Bakım / Onarım', '#fdcb6e', 12),
      ('Banka Masrafları', '#74b9ff', 13), ('Diğer', '#b2bec3', 99)
    ) as v(n, c, o);
    insert into public.categories (org_id, type, name, sort_order) values
      (p_org, 'product', 'Genel', 1),
      (p_org, 'income', 'Diğer Gelirler', 1);
  end if;

  return jsonb_build_object('success', true, 'mode', p_mode);
end;
$$;

grant execute on function public.reset_organization_data(uuid, text) to authenticated;
