-- =====================================================================
-- 010 · Operasyon fonksiyonları: ödemeli belge kaydı, belge durumu, cari ekstre,
--       stok transfer/sayım, çek-senet yaşam döngüsü, çalışan bakiyeleri
-- =====================================================================

-- ---------------------------------------------------------------------
-- Satış çıkışlarında o anki ortalama maliyeti de yaz (kârlılık raporu için)
-- ---------------------------------------------------------------------
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
              then round(l.net_amount * d.exchange_rate / (l.quantity * l.unit_factor), 4)
              else p.avg_cost end,
         d.id, l.id, d.created_by
    from public.document_lines l
    join public.products p on p.id = l.product_id
   where l.document_id = p_doc and p.track_stock and p.type = 'product' and l.quantity <> 0;
end;
$$;

-- ---------------------------------------------------------------------
-- Belge kaydet + (isteğe bağlı) anında tahsilat/ödeme
--   p_payment: { id?, account_id, amount?, method?, txn_date? }
-- ---------------------------------------------------------------------
drop function if exists public.save_document(jsonb, jsonb);

create or replace function public.save_document(p_doc jsonb, p_lines jsonb default '[]'::jsonb, p_payment jsonb default null)
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
  v_pay_id uuid;
  v_pay_amount numeric;
  v_acc_currency text;
begin
  if not public.can_write(v_org) then raise exception 'Bu firmada kayıt yetkiniz yok'; end if;

  select * into v_existing from public.documents where id = v_id;
  if found and v_existing.org_id <> v_org then raise exception 'Geçersiz belge'; end if;
  if found then v_type := v_existing.doc_type; end if;

  if (v_number is null or v_number like 'TASLAK%')
     and coalesce(p_doc->>'status', 'approved') <> 'draft' then
    v_number := coalesce(nullif(v_existing.number, ''),
                         public.next_document_number(v_org, v_type, coalesce((p_doc->>'issue_date')::date, current_date)));
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

  if (p_doc->>'source_document_id') is not null and v_existing.id is null then
    update public.documents set status = 'converted'
     where id = (p_doc->>'source_document_id')::uuid and org_id = v_org
       and doc_type in ('quote','sales_order','purchase_order','sales_delivery','purchase_delivery');
  end if;

  -- anında tahsilat / ödeme
  if p_payment is not null and (p_payment->>'account_id') is not null then
    select * into v_result from public.documents where id = v_id;
    v_pay_id := coalesce((p_payment->>'id')::uuid, gen_random_uuid());
    v_pay_amount := coalesce((p_payment->>'amount')::numeric, v_result.total);
    select currency into v_acc_currency from public.accounts where id = (p_payment->>'account_id')::uuid and org_id = v_org;
    if v_pay_amount > 0 then
      perform public.save_transaction(
        jsonb_build_object(
          'id', v_pay_id, 'org_id', v_org,
          'type', case when v_type in ('sales_invoice','pos_sale','purchase_return') then 'collection' else 'payment' end,
          'direction', case when v_type in ('sales_invoice','pos_sale','purchase_return') then 'in' else 'out' end,
          'txn_date', coalesce(p_payment->>'txn_date', v_result.issue_date::text),
          'account_id', p_payment->>'account_id',
          'contact_id', v_result.contact_id,
          'employee_id', v_result.employee_id,
          'category_id', v_result.category_id,
          'amount', v_pay_amount,
          'currency', coalesce(v_acc_currency, v_result.currency),
          'exchange_rate', case when coalesce(v_acc_currency, 'TRY') = v_result.currency then v_result.exchange_rate else 1 end,
          'method', coalesce(p_payment->>'method', 'cash'),
          'description', coalesce(v_result.number, v_result.description)),
        jsonb_build_array(jsonb_build_object('document_id', v_id, 'amount', least(v_pay_amount, v_result.total))));
    end if;
  end if;

  select * into v_result from public.documents where id = v_id;
  return v_result;
end;
$$;

-- Belge durumu (onay/iptal/taslak) — stok hareketlerini yeniden kurar
create or replace function public.set_document_status(p_doc uuid, p_status text)
returns public.documents
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.documents;
begin
  select * into d from public.documents where id = p_doc;
  if d.id is null or not public.can_write(d.org_id) then raise exception 'Yetkisiz'; end if;
  if d.number is null and p_status not in ('draft','cancelled') then
    d.number := public.next_document_number(d.org_id, d.doc_type, d.issue_date);
  end if;
  update public.documents set status = p_status, number = d.number where id = p_doc;
  perform public.post_document_stock(p_doc);
  select * into d from public.documents where id = p_doc;
  return d;
end;
$$;

-- ---------------------------------------------------------------------
-- Cari ekstre (TL): borç = bize borçlandı, alacak = biz borçlandık
-- ---------------------------------------------------------------------
create or replace function public.contact_statement(p_contact uuid, p_from date default null, p_to date default null)
returns table (
  entry_date date, kind text, ref_id uuid, ref_type text, number text, description text,
  debit numeric, credit numeric, balance numeric, due_date date
)
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  c public.contacts;
  v_from date;
begin
  select * into c from public.contacts where id = p_contact;
  if c.id is null then return; end if;
  v_from := coalesce(p_from, '1900-01-01'::date);

  return query
  with entries as (
    select coalesce(c.opening_balance_date, c.created_at::date) as d, 'opening'::text as k, c.id as rid, 'opening'::text as rt,
           null::text as num, 'Açılış bakiyesi'::text as descr,
           greatest(c.opening_balance, 0) as dr, greatest(-c.opening_balance, 0) as cr, null::date as due, c.created_at as at
     where c.opening_balance <> 0
    union all
    select d.issue_date, 'document', d.id, d.doc_type, d.number, coalesce(d.description, d.number),
           case when d.doc_type in ('sales_invoice','pos_sale','purchase_return') then d.total_try else 0 end,
           case when d.doc_type in ('purchase_invoice','sales_return','expense') then d.total_try else 0 end,
           d.due_date, d.created_at
      from public.documents d
     where d.contact_id = p_contact and d.deleted_at is null and d.status not in ('draft','cancelled')
       and d.doc_type in ('sales_invoice','pos_sale','purchase_return','purchase_invoice','sales_return','expense')
    union all
    select t.txn_date, 'transaction', t.id, t.type, t.reference, t.description,
           case when t.direction = 'out' then t.amount_try else 0 end,
           case when t.direction = 'in' then t.amount_try else 0 end,
           null::date, t.created_at
      from public.transactions t
     where t.contact_id = p_contact and t.deleted_at is null and t.direction in ('in','out')
  ),
  ordered as (
    select e.*, sum(e.dr - e.cr) over (order by e.d, e.at, e.rid rows unbounded preceding) as bal
      from entries e
  )
  select o.d, o.k, o.rid, o.rt, o.num, o.descr, round(o.dr, 2), round(o.cr, 2), round(o.bal, 2), o.due
    from ordered o
   where o.d >= v_from and (p_to is null or o.d <= p_to)
   order by o.d, o.at, o.rid;
end;
$$;

-- Cari bakiye (açılış öncesi devir için)
create or replace function public.contact_balance_at(p_contact uuid, p_date date)
returns numeric
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(sum(debit - credit), 0) from public.contact_statement(p_contact, null, p_date - 1);
$$;

-- ---------------------------------------------------------------------
-- Depo transferi
--   p_lines: [{ product_id, quantity }]
-- ---------------------------------------------------------------------
create or replace function public.save_stock_transfer(p_transfer jsonb, p_lines jsonb)
returns public.stock_transfers
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce((p_transfer->>'id')::uuid, gen_random_uuid());
  v_org uuid := (p_transfer->>'org_id')::uuid;
  v_date date := coalesce((p_transfer->>'transfer_date')::date, current_date);
  v_from uuid := (p_transfer->>'from_warehouse_id')::uuid;
  v_to uuid := (p_transfer->>'to_warehouse_id')::uuid;
  v_line jsonb;
  v_number text;
  r public.stock_transfers;
begin
  if not public.can_write(v_org) then raise exception 'Yetkisiz'; end if;
  select number into v_number from public.stock_transfers where id = v_id;
  v_number := coalesce(v_number, public.next_document_number(v_org, 'stock_transfer', v_date));

  insert into public.stock_transfers (id, org_id, number, transfer_date, from_warehouse_id, to_warehouse_id, description)
  values (v_id, v_org, v_number, v_date, v_from, v_to, p_transfer->>'description')
  on conflict (id) do update set transfer_date = excluded.transfer_date, from_warehouse_id = excluded.from_warehouse_id,
    to_warehouse_id = excluded.to_warehouse_id, description = excluded.description, deleted_at = null;

  delete from public.stock_movements where transfer_id = v_id;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    if (v_line->>'quantity')::numeric > 0 then
      insert into public.stock_movements (org_id, product_id, warehouse_id, movement_date, movement_type, quantity, transfer_id, description)
      values (v_org, (v_line->>'product_id')::uuid, v_from, v_date, 'transfer_out', -(v_line->>'quantity')::numeric, v_id, v_number),
             (v_org, (v_line->>'product_id')::uuid, v_to,   v_date, 'transfer_in',   (v_line->>'quantity')::numeric, v_id, v_number);
    end if;
  end loop;

  select * into r from public.stock_transfers where id = v_id;
  return r;
end;
$$;

create or replace function public.delete_stock_transfer(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  select org_id into v_org from public.stock_transfers where id = p_id;
  if v_org is null or not public.can_write(v_org) then raise exception 'Yetkisiz'; end if;
  delete from public.stock_movements where transfer_id = p_id;
  update public.stock_transfers set deleted_at = now() where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Stok sayımı / düzeltme / açılış
--   p_mode: 'set' (sayılan miktar) | 'delta' (fark) | 'opening' (açılış girişi)
-- ---------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_org uuid, p_product uuid, p_warehouse uuid, p_quantity numeric,
  p_mode text default 'set', p_date date default current_date, p_note text default null,
  p_unit_cost numeric default null, p_id uuid default null)
returns public.stock_movements
language plpgsql security definer
set search_path = ''
as $$
declare
  v_current numeric;
  v_delta numeric;
  v_wh uuid;
  v_cost numeric;
  r public.stock_movements;
begin
  if not public.can_write(p_org) then raise exception 'Yetkisiz'; end if;
  if p_id is not null and exists (select 1 from public.stock_movements where id = p_id) then
    select * into r from public.stock_movements where id = p_id;
    return r; -- idempotent (çevrimdışı tekrar gönderim)
  end if;
  v_wh := coalesce(p_warehouse, (select id from public.warehouses where org_id = p_org and is_default and deleted_at is null limit 1));
  select coalesce(quantity, 0) into v_current from public.product_stocks where product_id = p_product and warehouse_id = v_wh;
  v_current := coalesce(v_current, 0);
  v_delta := case p_mode when 'set' then p_quantity - v_current else p_quantity end;
  if v_delta = 0 then return null; end if;
  select coalesce(p_unit_cost, avg_cost) into v_cost from public.products where id = p_product and org_id = p_org;

  insert into public.stock_movements (id, org_id, product_id, warehouse_id, movement_date, movement_type, quantity, unit_cost, description)
  values (coalesce(p_id, gen_random_uuid()), p_org, p_product, v_wh, p_date,
          case p_mode when 'opening' then 'opening' when 'set' then 'count' else 'adjustment' end,
          v_delta, v_cost, p_note)
  returning * into r;
  return r;
end;
$$;

-- ---------------------------------------------------------------------
-- Çek & senet
-- ---------------------------------------------------------------------
alter table public.cheque_events add column if not exists transaction_id uuid references public.transactions(id) on delete set null;

-- Yeni çek/senet: alınan -> cari alacağı düşer ; verilen -> cari borcu düşer
create or replace function public.save_cheque(p_cheque jsonb)
returns public.cheques
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce((p_cheque->>'id')::uuid, gen_random_uuid());
  v_org uuid := (p_cheque->>'org_id')::uuid;
  v_existing public.cheques;
  r public.cheques;
  v_txn uuid;
begin
  if not public.can_write(v_org) then raise exception 'Yetkisiz'; end if;
  select * into v_existing from public.cheques where id = v_id;

  insert into public.cheques (id, org_id, kind, direction, serial_number, bank_name, branch, account_number, drawer,
                              contact_id, amount, currency, exchange_rate, issue_date, due_date, notes, image_path)
  values (v_id, v_org, coalesce(p_cheque->>'kind', 'cheque'), p_cheque->>'direction', p_cheque->>'serial_number',
          p_cheque->>'bank_name', p_cheque->>'branch', p_cheque->>'account_number', p_cheque->>'drawer',
          (p_cheque->>'contact_id')::uuid, (p_cheque->>'amount')::numeric, coalesce(p_cheque->>'currency', 'TRY'),
          coalesce((p_cheque->>'exchange_rate')::numeric, 1), coalesce((p_cheque->>'issue_date')::date, current_date),
          (p_cheque->>'due_date')::date, p_cheque->>'notes', p_cheque->>'image_path')
  on conflict (id) do update set kind = excluded.kind, serial_number = excluded.serial_number,
    bank_name = excluded.bank_name, branch = excluded.branch, account_number = excluded.account_number,
    drawer = excluded.drawer, contact_id = excluded.contact_id, amount = excluded.amount,
    currency = excluded.currency, exchange_rate = excluded.exchange_rate, issue_date = excluded.issue_date,
    due_date = excluded.due_date, notes = excluded.notes, image_path = excluded.image_path, deleted_at = null;

  select * into r from public.cheques where id = v_id;

  -- cari etkisi (ilk hareket)
  select id into v_txn from public.transactions
   where cheque_id = v_id and type in ('cheque_in','cheque_out') and deleted_at is null limit 1;
  if r.contact_id is not null then
    perform public.save_transaction(jsonb_build_object(
      'id', coalesce(v_txn, gen_random_uuid()), 'org_id', v_org,
      'type', case r.direction when 'received' then 'cheque_in' else 'cheque_out' end,
      'direction', case r.direction when 'received' then 'in' else 'out' end,
      'txn_date', r.issue_date, 'contact_id', r.contact_id, 'cheque_id', v_id,
      'amount', r.amount, 'currency', r.currency, 'exchange_rate', r.exchange_rate,
      'method', case r.kind when 'note' then 'note' else 'cheque' end,
      'reference', r.serial_number,
      'description', case r.direction when 'received' then 'Alınan ' else 'Verilen ' end ||
                     case r.kind when 'note' then 'senet' else 'çek' end), null);
  elsif v_txn is not null then
    update public.transactions set deleted_at = now() where id = v_txn;
  end if;

  if v_existing.id is null then
    insert into public.cheque_events (org_id, cheque_id, event_date, status, note)
    values (v_org, v_id, r.issue_date, 'portfolio', 'Kayıt');
  end if;
  return r;
end;
$$;

-- Durum değişikliği: tahsil / ödeme / karşılıksız / iade / portföye dönüş
create or replace function public.set_cheque_status(
  p_cheque uuid, p_status text, p_date date default current_date,
  p_account uuid default null, p_note text default null)
returns public.cheques
language plpgsql security definer
set search_path = ''
as $$
declare
  c public.cheques;
  v_txn uuid;
  v_kind_label text;
begin
  select * into c from public.cheques where id = p_cheque;
  if c.id is null or not public.can_write(c.org_id) then raise exception 'Yetkisiz'; end if;
  v_kind_label := case c.kind when 'note' then 'Senet' else 'Çek' end;

  -- önceki durum hareketlerini geri al
  update public.transactions set deleted_at = now()
   where cheque_id = p_cheque and type not in ('cheque_in','cheque_out') and deleted_at is null;

  if c.direction = 'received' then
    if p_status = 'collected' then
      if p_account is null then raise exception 'Tahsil edilecek hesabı seçin'; end if;
      v_txn := gen_random_uuid();
      perform public.save_transaction(jsonb_build_object('id', v_txn, 'org_id', c.org_id, 'type', 'cheque_collect',
        'direction', 'in', 'txn_date', p_date, 'account_id', p_account, 'cheque_id', p_cheque,
        'amount', c.amount, 'currency', c.currency, 'exchange_rate', c.exchange_rate,
        'method', 'cheque', 'reference', c.serial_number, 'description', v_kind_label || ' tahsili'), null);
    elsif p_status in ('bounced','returned') and c.contact_id is not null then
      v_txn := gen_random_uuid();
      perform public.save_transaction(jsonb_build_object('id', v_txn, 'org_id', c.org_id, 'type', 'adjustment',
        'direction', 'out', 'txn_date', p_date, 'contact_id', c.contact_id, 'cheque_id', p_cheque,
        'amount', c.amount, 'currency', c.currency, 'exchange_rate', c.exchange_rate, 'reference', c.serial_number,
        'description', v_kind_label || case p_status when 'bounced' then ' karşılıksız' else ' iade' end), null);
    end if;
  else
    if p_status = 'paid' then
      if p_account is null then raise exception 'Ödeme hesabını seçin'; end if;
      v_txn := gen_random_uuid();
      perform public.save_transaction(jsonb_build_object('id', v_txn, 'org_id', c.org_id, 'type', 'cheque_pay',
        'direction', 'out', 'txn_date', p_date, 'account_id', p_account, 'cheque_id', p_cheque,
        'amount', c.amount, 'currency', c.currency, 'exchange_rate', c.exchange_rate,
        'method', 'cheque', 'reference', c.serial_number, 'description', v_kind_label || ' ödemesi'), null);
    elsif p_status in ('bounced','returned') and c.contact_id is not null then
      v_txn := gen_random_uuid();
      perform public.save_transaction(jsonb_build_object('id', v_txn, 'org_id', c.org_id, 'type', 'adjustment',
        'direction', 'in', 'txn_date', p_date, 'contact_id', c.contact_id, 'cheque_id', p_cheque,
        'amount', c.amount, 'currency', c.currency, 'exchange_rate', c.exchange_rate, 'reference', c.serial_number,
        'description', v_kind_label || case p_status when 'bounced' then ' karşılıksız' else ' iade' end), null);
    end if;
  end if;

  update public.cheques set status = p_status,
         account_id = case when p_status in ('collected','paid','deposited') then p_account else null end
   where id = p_cheque;
  insert into public.cheque_events (org_id, cheque_id, event_date, status, note, transaction_id)
  values (c.org_id, p_cheque, p_date, p_status, p_note, v_txn);

  select * into c from public.cheques where id = p_cheque;
  return c;
end;
$$;

create or replace function public.delete_cheque(p_cheque uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  select org_id into v_org from public.cheques where id = p_cheque;
  if v_org is null or not public.can_write(v_org) then raise exception 'Yetkisiz'; end if;
  update public.transactions set deleted_at = now() where cheque_id = p_cheque and deleted_at is null;
  update public.cheques set deleted_at = now() where id = p_cheque;
end;
$$;

-- ---------------------------------------------------------------------
-- Çalışan bakiyeleri (+ : çalışana borçluyuz)
-- ---------------------------------------------------------------------
create or replace view public.employee_balances
with (security_invoker = true) as
select e.id as employee_id, e.org_id,
       round(coalesce((select sum(total_try) from public.documents d
                        where d.employee_id = e.id and d.deleted_at is null and d.doc_type = 'salary'
                          and d.status not in ('draft','cancelled')), 0)
           - coalesce((select sum(case direction when 'out' then amount_try else -amount_try end) from public.transactions t
                        where t.employee_id = e.id and t.deleted_at is null and t.direction in ('in','out')), 0), 2) as balance
  from public.employees e
 where e.deleted_at is null;

-- Hesap hareket dökümü (yürüyen bakiye)
create or replace function public.account_statement(p_account uuid, p_from date default null, p_to date default null)
returns table (
  id uuid, txn_date date, type text, direction text, description text, reference text,
  party text, amount_in numeric, amount_out numeric, balance numeric
)
language sql stable security invoker
set search_path = ''
as $$
  with rows as (
    select t.id, t.txn_date, t.type, t.direction, t.description, t.reference, t.created_at,
           coalesce(c.name, e.name, case when t.direction = 'transfer' then
             case when t.account_id = p_account then '→ ' || a2.name else '← ' || a1.name end end) as party,
           case when (t.direction = 'in' and t.account_id = p_account) then t.amount
                when (t.direction = 'transfer' and t.to_account_id = p_account) then coalesce(t.to_amount, t.amount)
                else 0 end as amt_in,
           case when (t.direction = 'out' and t.account_id = p_account)
                  or (t.direction = 'transfer' and t.account_id = p_account) then t.amount else 0 end as amt_out
      from public.transactions t
      left join public.contacts c on c.id = t.contact_id
      left join public.employees e on e.id = t.employee_id
      left join public.accounts a1 on a1.id = t.account_id
      left join public.accounts a2 on a2.id = t.to_account_id
     where t.deleted_at is null and (t.account_id = p_account or t.to_account_id = p_account)
  ), bal as (
    select r.*, sum(r.amt_in - r.amt_out) over (order by r.txn_date, r.created_at, r.id rows unbounded preceding) as running
      from rows r
  )
  select b.id, b.txn_date, b.type, b.direction, b.description, b.reference, b.party,
         round(b.amt_in, 2), round(b.amt_out, 2), round(b.running, 2)
    from bal b
   where (p_from is null or b.txn_date >= p_from) and (p_to is null or b.txn_date <= p_to)
   order by b.txn_date desc, b.id desc;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.save_document(jsonb, jsonb, jsonb)',
    'public.set_document_status(uuid, text)',
    'public.contact_statement(uuid, date, date)',
    'public.contact_balance_at(uuid, date)',
    'public.save_stock_transfer(jsonb, jsonb)',
    'public.delete_stock_transfer(uuid)',
    'public.adjust_stock(uuid, uuid, uuid, numeric, text, date, text, numeric, uuid)',
    'public.save_cheque(jsonb)',
    'public.set_cheque_status(uuid, text, date, uuid, text)',
    'public.delete_cheque(uuid)',
    'public.account_statement(uuid, date, date)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.post_document_stock(uuid) from public, anon, authenticated;
