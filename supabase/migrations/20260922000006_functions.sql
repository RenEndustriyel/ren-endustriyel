-- =====================================================================
-- 006 · İş mantığı: firma kurulumu, belge kaydetme (tutar/stok/numara),
--       para hareketi kaydetme, cari bakiyeleri, panel özeti
-- =====================================================================

revoke execute on function private.setup_org_table(text, text) from public;

-- ---------------------------------------------------------------------
-- Firma için varsayılan veriler
-- ---------------------------------------------------------------------
create or replace function private.seed_organization(p_org uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  select code into v_code from public.organizations where id = p_org;

  insert into public.units (org_id, name, code, decimals, sort_order) values
    (p_org, 'Adet',  'ADET',  0, 1),
    (p_org, 'Kilo',  'KG',    3, 2),
    (p_org, 'Gram',  'GR',    0, 3),
    (p_org, 'Litre', 'LT',    3, 4),
    (p_org, 'Paket', 'PAKET', 0, 5),
    (p_org, 'Koli',  'KOLI',  0, 6),
    (p_org, 'Bidon', 'BIDON', 0, 7)
  on conflict (org_id, code) do nothing;

  insert into public.number_series (org_id, doc_type, prefix) values
    (p_org, 'sales_invoice',    v_code),
    (p_org, 'quote',            'TKL'),
    (p_org, 'sales_order',      'SIP'),
    (p_org, 'sales_delivery',   'IRS'),
    (p_org, 'sales_return',     'IAD'),
    (p_org, 'pos_sale',         'HZL'),
    (p_org, 'purchase_order',   'SAS'),
    (p_org, 'purchase_return',  'AIA'),
    (p_org, 'stock_transfer',   'TRF')
  on conflict (org_id, doc_type) do nothing;

  if not exists (select 1 from public.warehouses where org_id = p_org) then
    insert into public.warehouses (org_id, name, is_default) values (p_org, 'Merkez Depo', true);
  end if;

  if not exists (select 1 from public.accounts where org_id = p_org) then
    insert into public.accounts (org_id, type, name, currency, sort_order) values
      (p_org, 'cash', 'Merkez Kasa', 'TRY', 1);
  end if;

  if not exists (select 1 from public.price_lists where org_id = p_org) then
    insert into public.price_lists (org_id, name, is_default) values
      (p_org, 'Perakende', true),
      (p_org, 'Bayi', false);
  end if;

  if not exists (select 1 from public.categories where org_id = p_org) then
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
end;
$$;

-- Oturum açmış kullanıcı yeni firma kurar ve sahibi olur
create or replace function public.create_organization(
  p_name text,
  p_code text default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  v_code := upper(coalesce(nullif(trim(p_code), ''),
                           left(regexp_replace(upper(translate(p_name, 'çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU')), '[^A-Z0-9]', '', 'g'), 3)));
  if v_code !~ '^[A-Z0-9]{2,6}$' then v_code := 'FRM'; end if;

  insert into public.organizations (name, code, legal_name, tax_number, tax_office, address, district, city, phone, email, created_by)
  values (trim(p_name), v_code,
          p_details->>'legal_name', p_details->>'tax_number', p_details->>'tax_office',
          p_details->>'address', p_details->>'district', p_details->>'city',
          p_details->>'phone', p_details->>'email', auth.uid())
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  perform private.seed_organization(v_org);
  update public.profiles set default_org_id = coalesce(default_org_id, v_org) where id = auth.uid();
  return v_org;
end;
$$;

-- ---------------------------------------------------------------------
-- Belge tutarlarını satırlardan yeniden hesapla
-- ---------------------------------------------------------------------
create or replace function public.recalc_document(p_doc uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.documents;
  v_line_net_sum numeric;   -- satır iskontosu sonrası toplam (girilen fiyat bazında)
  v_ratio numeric := 0;     -- genel iskonto oranı (0..1)
begin
  select * into d from public.documents where id = p_doc;
  if not found then return; end if;

  select coalesce(sum(quantity * unit_price * (1 - discount_rate / 100)), 0)
    into v_line_net_sum
    from public.document_lines where document_id = p_doc;

  if d.discount_value > 0 and v_line_net_sum > 0 then
    v_ratio := case d.discount_type
                 when 'rate' then least(d.discount_value, 100) / 100
                 else least(d.discount_value / v_line_net_sum, 1) end;
  end if;

  update public.document_lines l set
    gross_amount    = x.gross,
    net_amount      = x.net,
    discount_amount = x.gross - x.net,
    vat_amount      = x.vat,
    total_amount    = x.net + x.vat
  from (
    select id,
      round(case when d.prices_include_vat then quantity * unit_price / (1 + vat_rate / 100)
                 else quantity * unit_price end, 2) as gross,
      round(case when d.prices_include_vat
                 then quantity * unit_price * (1 - discount_rate / 100) * (1 - v_ratio) / (1 + vat_rate / 100)
                 else quantity * unit_price * (1 - discount_rate / 100) * (1 - v_ratio) end, 2) as net,
      round(case when d.prices_include_vat
                 then quantity * unit_price * (1 - discount_rate / 100) * (1 - v_ratio)
                      - quantity * unit_price * (1 - discount_rate / 100) * (1 - v_ratio) / (1 + vat_rate / 100)
                 else quantity * unit_price * (1 - discount_rate / 100) * (1 - v_ratio) * vat_rate / 100 end, 2) as vat
    from public.document_lines where document_id = p_doc
  ) x
  where l.id = x.id;

  update public.documents set
    (subtotal, discount_total, net_total, vat_total, total) = (
      select coalesce(sum(gross_amount), 0), coalesce(sum(discount_amount), 0),
             coalesce(sum(net_amount), 0), coalesce(sum(vat_amount), 0), coalesce(sum(total_amount), 0)
      from public.document_lines where document_id = p_doc)
  where id = p_doc;

  update public.documents set total_try = round(total * exchange_rate, 2) where id = p_doc;
  perform public.refresh_document_payment(p_doc);
end;
$$;

-- Belgenin stok etkisi: +1 giriş, -1 çıkış, 0 yok
create or replace function public.document_stock_sign(p_doc_type text)
returns int
language sql immutable
set search_path = ''
as $$
  select case p_doc_type
    when 'sales_invoice' then -1 when 'pos_sale' then -1 when 'sales_delivery' then -1 when 'purchase_return' then -1
    when 'purchase_invoice' then 1 when 'purchase_delivery' then 1 when 'sales_return' then 1
    else 0 end;
$$;

-- Belgenin stok hareketlerini yeniden oluştur
create or replace function public.post_document_stock(p_doc uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.documents;
  v_sign int;
  v_wh uuid;
begin
  select * into d from public.documents where id = p_doc;
  delete from public.stock_movements where document_id = p_doc;
  if d.id is null then return; end if;
  v_sign := public.document_stock_sign(d.doc_type);
  if v_sign = 0 or not d.affects_stock or d.deleted_at is not null
     or d.status in ('draft','cancelled') then
    return;
  end if;

  v_wh := coalesce(d.warehouse_id,
                   (select id from public.warehouses where org_id = d.org_id and is_default and deleted_at is null limit 1));

  insert into public.stock_movements (org_id, product_id, warehouse_id, movement_date, movement_type,
                                      quantity, unit_cost, document_id, document_line_id, created_by)
  select d.org_id, l.product_id, v_wh, d.issue_date,
         case d.doc_type
           when 'purchase_invoice' then 'purchase' when 'purchase_delivery' then 'purchase'
           when 'sales_return' then 'sales_return' when 'purchase_return' then 'purchase_return'
           else 'sale' end,
         v_sign * l.quantity * l.unit_factor,
         case when v_sign > 0 and d.doc_type in ('purchase_invoice','purchase_delivery') and l.quantity > 0
              then round(l.net_amount * d.exchange_rate / (l.quantity * l.unit_factor), 4) end,
         d.id, l.id, d.created_by
    from public.document_lines l
    join public.products p on p.id = l.product_id
   where l.document_id = p_doc and p.track_stock and p.type = 'product' and l.quantity <> 0;
end;
$$;

-- ---------------------------------------------------------------------
-- Belge kaydet (oluştur/güncelle) — tek işlem, idempotent (offline senkron için)
--   p_doc   : documents alanları (id istemcide üretilebilir)
--   p_lines : [{ id?, product_id, description, quantity, unit_id, unit_factor, unit_price, discount_rate, vat_rate }]
-- ---------------------------------------------------------------------
create or replace function public.save_document(p_doc jsonb, p_lines jsonb default '[]'::jsonb)
returns public.documents
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce((p_doc->>'id')::uuid, gen_random_uuid());
  v_org uuid := (p_doc->>'org_id')::uuid;
  v_existing public.documents;
  v_type text := p_doc->>'doc_type';
  v_number text := nullif(trim(p_doc->>'number'), '');
  v_contact public.contacts;
  v_result public.documents;
  v_line jsonb;
  v_pos int := 0;
begin
  if not public.can_write(v_org) then raise exception 'Bu firmada kayıt yetkiniz yok'; end if;

  select * into v_existing from public.documents where id = v_id;
  if found and v_existing.org_id <> v_org then raise exception 'Geçersiz belge'; end if;
  if found then v_type := v_existing.doc_type; end if;

  -- numara: boşsa veya taslak numarasıysa seriden al
  if (v_number is null or v_number like 'TASLAK%')
     and coalesce(p_doc->>'status', 'approved') <> 'draft' then
    v_number := coalesce(v_existing.number, public.next_document_number(v_org, v_type, coalesce((p_doc->>'issue_date')::date, current_date)));
  end if;

  if (p_doc->>'contact_id') is not null then
    select * into v_contact from public.contacts where id = (p_doc->>'contact_id')::uuid and org_id = v_org;
  end if;

  insert into public.documents as t (
    id, org_id, doc_type, status, number, issue_date, due_date, valid_until,
    contact_id, employee_id, warehouse_id, category_id, currency, exchange_rate,
    prices_include_vat, discount_type, discount_value, affects_stock,
    source_document_id, contact_snapshot, description, notes, terms)
  values (
    v_id, v_org, v_type,
    coalesce(p_doc->>'status', 'approved'),
    v_number,
    coalesce((p_doc->>'issue_date')::date, current_date),
    (p_doc->>'due_date')::date,
    (p_doc->>'valid_until')::date,
    (p_doc->>'contact_id')::uuid,
    (p_doc->>'employee_id')::uuid,
    (p_doc->>'warehouse_id')::uuid,
    (p_doc->>'category_id')::uuid,
    coalesce(p_doc->>'currency', 'TRY'),
    coalesce((p_doc->>'exchange_rate')::numeric, 1),
    coalesce((p_doc->>'prices_include_vat')::boolean, false),
    coalesce(p_doc->>'discount_type', 'rate'),
    coalesce((p_doc->>'discount_value')::numeric, 0),
    coalesce((p_doc->>'affects_stock')::boolean, true),
    (p_doc->>'source_document_id')::uuid,
    case when v_contact.id is not null then jsonb_build_object(
      'name', v_contact.name, 'tax_number', v_contact.tax_number, 'tax_office', v_contact.tax_office,
      'address', v_contact.address, 'district', v_contact.district, 'city', v_contact.city,
      'phone', v_contact.phone, 'email', v_contact.email) end,
    p_doc->>'description', p_doc->>'notes', p_doc->>'terms')
  on conflict (id) do update set
    status = excluded.status, number = excluded.number, issue_date = excluded.issue_date,
    due_date = excluded.due_date, valid_until = excluded.valid_until,
    contact_id = excluded.contact_id, employee_id = excluded.employee_id,
    warehouse_id = excluded.warehouse_id, category_id = excluded.category_id,
    currency = excluded.currency, exchange_rate = excluded.exchange_rate,
    prices_include_vat = excluded.prices_include_vat, discount_type = excluded.discount_type,
    discount_value = excluded.discount_value, affects_stock = excluded.affects_stock,
    contact_snapshot = excluded.contact_snapshot, description = excluded.description,
    notes = excluded.notes, terms = excluded.terms, deleted_at = null;

  delete from public.document_lines where document_id = v_id;
  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    v_pos := v_pos + 1;
    insert into public.document_lines (
      id, org_id, document_id, position, product_id, description, quantity, unit_id,
      unit_factor, unit_price, discount_rate, vat_rate)
    values (
      coalesce((v_line->>'id')::uuid, gen_random_uuid()), v_org, v_id, v_pos,
      (v_line->>'product_id')::uuid, v_line->>'description',
      coalesce((v_line->>'quantity')::numeric, 1),
      (v_line->>'unit_id')::uuid,
      coalesce((v_line->>'unit_factor')::numeric, 1),
      coalesce((v_line->>'unit_price')::numeric, 0),
      coalesce((v_line->>'discount_rate')::numeric, 0),
      coalesce((v_line->>'vat_rate')::numeric, 20));
  end loop;

  perform public.recalc_document(v_id);
  perform public.post_document_stock(v_id);

  -- kaynak belgeyi "dönüştürüldü" yap (teklif -> fatura vb.)
  if (p_doc->>'source_document_id') is not null and v_existing.id is null then
    update public.documents set status = 'converted'
     where id = (p_doc->>'source_document_id')::uuid and org_id = v_org
       and doc_type in ('quote','sales_order','purchase_order');
  end if;

  select * into v_result from public.documents where id = v_id;
  return v_result;
end;
$$;

-- Belge sil (soft) + stok ve eşleştirmeleri geri al
create or replace function public.delete_document(p_doc uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  select org_id into v_org from public.documents where id = p_doc;
  if v_org is null or not public.can_write(v_org) then raise exception 'Yetkisiz'; end if;
  update public.documents set deleted_at = now() where id = p_doc;
  delete from public.payment_allocations where document_id = p_doc;
  perform public.post_document_stock(p_doc);
end;
$$;

-- ---------------------------------------------------------------------
-- Para hareketi kaydet + belgelere dağıt (kısmi tahsilat)
--   p_allocations: [{ document_id, amount }]  (belge para biriminde)
-- ---------------------------------------------------------------------
create or replace function public.save_transaction(p_txn jsonb, p_allocations jsonb default '[]'::jsonb)
returns public.transactions
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce((p_txn->>'id')::uuid, gen_random_uuid());
  v_org uuid := (p_txn->>'org_id')::uuid;
  v_existing public.transactions;
  v_result public.transactions;
  v_alloc jsonb;
  v_currency text;
begin
  if not public.can_write(v_org) then raise exception 'Bu firmada kayıt yetkiniz yok'; end if;
  select * into v_existing from public.transactions where id = v_id;
  if found and v_existing.org_id <> v_org then raise exception 'Geçersiz kayıt'; end if;

  v_currency := coalesce(p_txn->>'currency',
                         (select currency from public.accounts where id = (p_txn->>'account_id')::uuid),
                         'TRY');

  insert into public.transactions as t (
    id, org_id, type, direction, txn_date, account_id, to_account_id, contact_id, employee_id,
    cheque_id, category_id, amount, to_amount, currency, exchange_rate, method, description, reference)
  values (
    v_id, v_org, p_txn->>'type', p_txn->>'direction',
    coalesce((p_txn->>'txn_date')::date, current_date),
    (p_txn->>'account_id')::uuid, (p_txn->>'to_account_id')::uuid,
    (p_txn->>'contact_id')::uuid, (p_txn->>'employee_id')::uuid,
    (p_txn->>'cheque_id')::uuid, (p_txn->>'category_id')::uuid,
    (p_txn->>'amount')::numeric, (p_txn->>'to_amount')::numeric,
    v_currency, coalesce((p_txn->>'exchange_rate')::numeric, 1),
    p_txn->>'method', p_txn->>'description', p_txn->>'reference')
  on conflict (id) do update set
    type = excluded.type, direction = excluded.direction, txn_date = excluded.txn_date,
    account_id = excluded.account_id, to_account_id = excluded.to_account_id,
    contact_id = excluded.contact_id, employee_id = excluded.employee_id,
    cheque_id = excluded.cheque_id, category_id = excluded.category_id,
    amount = excluded.amount, to_amount = excluded.to_amount, currency = excluded.currency,
    exchange_rate = excluded.exchange_rate, method = excluded.method,
    description = excluded.description, reference = excluded.reference, deleted_at = null;

  if p_allocations is not null then
    delete from public.payment_allocations where transaction_id = v_id;
    for v_alloc in select * from jsonb_array_elements(p_allocations) loop
      if (v_alloc->>'amount')::numeric > 0 then
        insert into public.payment_allocations (org_id, transaction_id, document_id, amount)
        select v_org, v_id, d.id, (v_alloc->>'amount')::numeric
          from public.documents d
         where d.id = (v_alloc->>'document_id')::uuid and d.org_id = v_org;
      end if;
    end loop;
  end if;

  select * into v_result from public.transactions where id = v_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- Cari bakiyeleri (TL)  +  : bize borçlu (alacağımız)  -  : bizim borcumuz
-- ---------------------------------------------------------------------
create or replace view public.contact_balances
with (security_invoker = true) as
with doc as (
  select contact_id,
         sum(case when doc_type in ('sales_invoice','pos_sale','purchase_return') then total_try
                  when doc_type in ('purchase_invoice','sales_return','expense') then -total_try
                  else 0 end) as amt
    from public.documents
   where deleted_at is null and contact_id is not null and status not in ('draft','cancelled')
   group by contact_id
), txn as (
  select contact_id,
         sum(case direction when 'in' then -amount_try when 'out' then amount_try else 0 end) as amt
    from public.transactions
   where deleted_at is null and contact_id is not null
   group by contact_id
)
select c.id as contact_id, c.org_id,
       round(c.opening_balance + coalesce(doc.amt, 0) + coalesce(txn.amt, 0), 2) as balance
  from public.contacts c
  left join doc on doc.contact_id = c.id
  left join txn on txn.contact_id = c.id
 where c.deleted_at is null;

-- ---------------------------------------------------------------------
-- Panel özeti (Güncel Durum)
-- ---------------------------------------------------------------------
create or replace function public.dashboard_summary(p_org uuid, p_today date default current_date)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  v_month_start date := date_trunc('month', p_today)::date;
  v_prev_month_start date := (date_trunc('month', p_today) - interval '1 month')::date;
  v_usd numeric := coalesce(public.latest_rate('USD', p_today), 0);
  v_eur numeric := coalesce(public.latest_rate('EUR', p_today), 0);
  v_result jsonb;
  v_cash numeric;
begin
  if not public.is_member(p_org) then raise exception 'Yetkisiz'; end if;

  select coalesce(sum(case when currency = 'TRY' then balance
                           when currency = 'USD' then balance * v_usd
                           when currency = 'EUR' then balance * v_eur else 0 end), 0)
    into v_cash
    from public.accounts where org_id = p_org and deleted_at is null and type in ('cash','bank');

  with open_docs as (
    select d.id, d.doc_type, d.number, d.issue_date, d.due_date, d.currency,
           d.total, d.paid_amount, d.exchange_rate,
           round((d.total - d.paid_amount) * d.exchange_rate, 2) as remaining_try,
           case when d.doc_type in ('sales_invoice','pos_sale') then 'in' else 'out' end as flow,
           coalesce(c.name, e.name, cat.name, d.description) as party
      from public.documents d
      left join public.contacts c on c.id = d.contact_id
      left join public.employees e on e.id = d.employee_id
      left join public.categories cat on cat.id = d.category_id
     where d.org_id = p_org and d.deleted_at is null
       and d.status not in ('draft','cancelled')
       and d.doc_type in ('sales_invoice','pos_sale','purchase_invoice','expense','salary')
       and d.payment_status in ('unpaid','partial')
  ),
  month_sales as (
    select coalesce(sum(case when doc_type = 'sales_return' then -total_try else total_try end), 0) as amt
      from public.documents
     where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
       and doc_type in ('sales_invoice','pos_sale','sales_return')
       and issue_date >= v_month_start and issue_date <= p_today
  ),
  month_expenses as (
    select coalesce(sum(total_try), 0) as amt
      from public.documents
     where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
       and doc_type in ('expense','salary')
       and issue_date >= v_month_start and issue_date <= p_today
  ),
  vat as (
    select
      coalesce(sum(case when issue_date >= v_month_start then
        case when doc_type in ('sales_invoice','pos_sale','purchase_return') then vat_total * exchange_rate
             when doc_type in ('purchase_invoice','expense','sales_return') then -vat_total * exchange_rate else 0 end end), 0) as this_month,
      coalesce(sum(case when issue_date < v_month_start then
        case when doc_type in ('sales_invoice','pos_sale','purchase_return') then vat_total * exchange_rate
             when doc_type in ('purchase_invoice','expense','sales_return') then -vat_total * exchange_rate else 0 end end), 0) as last_month
      from public.documents
     where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
       and issue_date >= v_prev_month_start and issue_date <= p_today
  ),
  balances as (
    select coalesce(sum(balance) filter (where balance > 0), 0) as receivable,
           coalesce(-sum(balance) filter (where balance < 0), 0) as payable
      from public.contact_balances where org_id = p_org
  ),
  weeks as (
    select g as week_no, (p_today + g * 7) as week_start
      from generate_series(0, 11) g
  ),
  cheque_flow as (
    select case when direction = 'received' then 'in' else 'out' end as flow,
           due_date, round(amount * exchange_rate, 2) as amt
      from public.cheques
     where org_id = p_org and deleted_at is null and status in ('portfolio','deposited')
  ),
  flow_items as (
    select flow, coalesce(due_date, p_today) as due, remaining_try as amt from open_docs
    union all
    select flow, due_date, amt from cheque_flow
  ),
  cash_flow as (
    select w.week_no, w.week_start,
           coalesce(sum(f.amt) filter (where f.flow = 'in'), 0) as inflow,
           coalesce(sum(f.amt) filter (where f.flow = 'out'), 0) as outflow
      from weeks w
      left join flow_items f
        on (w.week_no = 0 and f.due < w.week_start + 7)
        or (w.week_no > 0 and f.due >= w.week_start and f.due < w.week_start + 7)
     group by w.week_no, w.week_start
  )
  select jsonb_build_object(
    'today', p_today,
    'rates', jsonb_build_object('USD', v_usd, 'EUR', v_eur),
    'kpi', jsonb_build_object(
      'month_sales', (select amt from month_sales),
      'month_expenses', (select amt from month_expenses),
      'today_collections', (select coalesce(sum(amount_try), 0) from public.transactions
                             where org_id = p_org and deleted_at is null and direction = 'in'
                               and type in ('collection','cheque_in') and txn_date = p_today),
      'cash_bank', round(v_cash, 2),
      'receivable', (select receivable from balances),
      'payable', (select payable from balances)
    ),
    'collections', jsonb_build_object(
      'total', coalesce((select sum(remaining_try) from open_docs where flow = 'in'), 0),
      'overdue', coalesce((select sum(remaining_try) from open_docs where flow = 'in' and due_date < p_today), 0),
      'unplanned', coalesce((select sum(remaining_try) from open_docs where flow = 'in' and due_date is null), 0),
      'unprinted', (select count(*) from public.documents where org_id = p_org and deleted_at is null
                      and doc_type = 'sales_invoice' and status not in ('draft','cancelled')
                      and not is_printed and sent_at is null)
    ),
    'payments', jsonb_build_object(
      'total', coalesce((select sum(remaining_try) from open_docs where flow = 'out'), 0),
      'overdue', coalesce((select sum(remaining_try) from open_docs where flow = 'out' and due_date < p_today), 0),
      'unplanned', coalesce((select sum(remaining_try) from open_docs where flow = 'out' and due_date is null), 0)
    ),
    'vat', jsonb_build_object('this_month', (select round(this_month, 2) from vat),
                              'last_month', (select round(last_month, 2) from vat)),
    'timeline', coalesce((
      select jsonb_agg(t order by t.due_date) from (
        select id, doc_type, number, due_date, flow, party, remaining_try as amount,
               (p_today - due_date) as days_overdue
          from open_docs where due_date is not null
         order by abs(p_today - due_date) limit 40
      ) t), '[]'::jsonb),
    'sales_daily', (
      select jsonb_agg(jsonb_build_object('date', g::date, 'amount', coalesce(s.amt, 0)) order by g)
        from generate_series(p_today - 13, p_today, interval '1 day') g
        left join (
          select issue_date, sum(case when doc_type = 'sales_return' then -total_try else total_try end) amt
            from public.documents
           where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
             and doc_type in ('sales_invoice','pos_sale','sales_return') and issue_date > p_today - 14
           group by issue_date) s on s.issue_date = g::date),
    'sales_monthly', (
      select jsonb_agg(jsonb_build_object('month', to_char(g, 'YYYY-MM'), 'amount', coalesce(s.amt, 0)) order by g)
        from generate_series(date_trunc('month', p_today) - interval '11 months', date_trunc('month', p_today), interval '1 month') g
        left join (
          select date_trunc('month', issue_date) m, sum(case when doc_type = 'sales_return' then -total_try else total_try end) amt
            from public.documents
           where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
             and doc_type in ('sales_invoice','pos_sale','sales_return')
             and issue_date >= date_trunc('month', p_today) - interval '11 months'
           group by 1) s on s.m = g),
    'top_products', coalesce((
      select jsonb_agg(t) from (
        select p.id, p.name, sum(l.quantity * l.unit_factor) as quantity, sum(l.net_amount * d.exchange_rate) as amount
          from public.document_lines l
          join public.documents d on d.id = l.document_id
          join public.products p on p.id = l.product_id
         where d.org_id = p_org and d.deleted_at is null and d.status not in ('draft','cancelled')
           and d.doc_type in ('sales_invoice','pos_sale') and d.issue_date >= v_month_start
         group by p.id, p.name order by amount desc limit 5) t), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(r order by r.at desc) from (
        (select 'document' as kind, d.id, d.doc_type as type, d.number, d.issue_date as date, d.created_at as at,
                coalesce(c.name, d.description) as party,
                case when d.doc_type in ('sales_invoice','pos_sale','purchase_return') then d.total_try else -d.total_try end as amount
           from public.documents d left join public.contacts c on c.id = d.contact_id
          where d.org_id = p_org and d.deleted_at is null
            and d.doc_type in ('sales_invoice','pos_sale','purchase_invoice','expense','sales_return','purchase_return','salary')
          order by d.created_at desc limit 8)
        union all
        (select 'transaction', t.id, t.type, null, t.txn_date, t.created_at,
                coalesce(c.name, e.name, t.description),
                case t.direction when 'in' then t.amount_try when 'out' then -t.amount_try else t.amount_try end
           from public.transactions t
           left join public.contacts c on c.id = t.contact_id
           left join public.employees e on e.id = t.employee_id
          where t.org_id = p_org and t.deleted_at is null
          order by t.created_at desc limit 8)
        order by at desc limit 8) r), '[]'::jsonb),
    'critical_stock', coalesce((
      select jsonb_agg(t) from (
        select id, name, stock_qty, critical_stock from public.products
         where org_id = p_org and deleted_at is null and is_active and track_stock and type = 'product'
           and critical_stock is not null and stock_qty <= critical_stock
         order by stock_qty - critical_stock limit 12) t), '[]'::jsonb),
    'currency', jsonb_build_object(
      'sales_usd', (select coalesce(sum(total), 0) from public.documents where org_id = p_org and deleted_at is null
                      and currency = 'USD' and doc_type in ('sales_invoice','pos_sale') and issue_date >= v_month_start
                      and status not in ('draft','cancelled')),
      'sales_eur', (select coalesce(sum(total), 0) from public.documents where org_id = p_org and deleted_at is null
                      and currency = 'EUR' and doc_type in ('sales_invoice','pos_sale') and issue_date >= v_month_start
                      and status not in ('draft','cancelled')),
      'cash_usd', (select coalesce(sum(balance), 0) from public.accounts where org_id = p_org and deleted_at is null and currency = 'USD'),
      'cash_eur', (select coalesce(sum(balance), 0) from public.accounts where org_id = p_org and deleted_at is null and currency = 'EUR')
    ),
    'cash_flow', jsonb_build_object(
      'opening', round(v_cash, 2),
      'weeks', (select jsonb_agg(jsonb_build_object('week', week_no, 'start', week_start,
                                                    'in', inflow, 'out', outflow) order by week_no) from cash_flow)
    )
  ) into v_result;

  return v_result;
end;
$$;

-- API'ye açık fonksiyon yetkileri
revoke execute on function public.recalc_document(uuid) from public, anon, authenticated;
revoke execute on function public.post_document_stock(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_document_payment(uuid) from public, anon, authenticated;
revoke execute on function private.seed_organization(uuid) from public, anon, authenticated;
revoke execute on function public.next_document_number(uuid, text, date) from anon;
revoke execute on function public.create_organization(text, text, jsonb) from anon;
revoke execute on function public.save_document(jsonb, jsonb) from anon;
revoke execute on function public.delete_document(uuid) from anon;
revoke execute on function public.save_transaction(jsonb, jsonb) from anon;
revoke execute on function public.dashboard_summary(uuid, date) from anon;
revoke execute on function public.accept_invitation(text) from anon;
