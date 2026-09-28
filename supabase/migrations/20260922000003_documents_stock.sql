-- =====================================================================
-- 003 · Çalışanlar, numara serileri, belgeler (teklif/sipariş/irsaliye/fatura/masraf),
--       stok hareketleri, depo transferleri
-- =====================================================================

-- ---------------------------------------------------------------------
-- Çalışanlar
-- ---------------------------------------------------------------------
create table public.employees (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  national_id text,
  position    text,
  department  text,
  phone       text,
  email       text,
  iban        text,
  start_date  date,
  end_date    date,
  salary      numeric(18,2),
  currency    text not null default 'TRY',
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
select private.setup_org_table('employees', 'admin');

-- ---------------------------------------------------------------------
-- Numara serileri  (örn. REN2026000001)
-- ---------------------------------------------------------------------
create table public.number_series (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  doc_type     text not null,
  prefix       text not null,
  include_year boolean not null default true,
  padding      smallint not null default 6 check (padding between 1 and 12),
  next_number  bigint not null default 1 check (next_number > 0),
  last_year    int,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, doc_type)
);
select private.setup_org_table('number_series', 'admin');

create or replace function public.next_document_number(p_org uuid, p_doc_type text, p_date date default current_date)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  s public.number_series;
  v_year int := extract(year from p_date)::int;
  v_num bigint;
begin
  if not public.can_write(p_org) and current_user not in ('postgres','service_role') then
    raise exception 'Yetkisiz';
  end if;
  select * into s from public.number_series
   where org_id = p_org and doc_type = p_doc_type
   for update;
  if not found then
    return null;
  end if;
  if s.include_year and coalesce(s.last_year, v_year) <> v_year then
    v_num := 1;
  else
    v_num := s.next_number;
  end if;
  update public.number_series
     set next_number = v_num + 1,
         last_year = case when s.include_year then v_year else last_year end
   where id = s.id;
  return s.prefix || case when s.include_year then v_year::text else '' end || lpad(v_num::text, s.padding, '0');
end;
$$;

-- ---------------------------------------------------------------------
-- Belgeler
--   quote            : Teklif
--   sales_order      : Satış siparişi
--   sales_delivery   : Giden irsaliye
--   sales_invoice    : Satış faturası
--   sales_return     : Satış iadesi
--   pos_sale         : Hızlı satış
--   purchase_order   : Satın alma siparişi
--   purchase_delivery: Gelen irsaliye
--   purchase_invoice : Alış faturası
--   purchase_return  : Alış iadesi
--   expense          : Masraf / fiş
--   salary           : Maaş tahakkuku
-- ---------------------------------------------------------------------
create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  doc_type           text not null check (doc_type in (
                        'quote','sales_order','sales_delivery','sales_invoice','sales_return','pos_sale',
                        'purchase_order','purchase_delivery','purchase_invoice','purchase_return',
                        'expense','salary')),
  status             text not null default 'approved' check (status in (
                        'draft','pending','sent','accepted','rejected','approved','converted','cancelled')),
  number             text,
  issue_date         date not null default current_date,
  due_date           date,
  valid_until        date,
  contact_id         uuid references public.contacts(id) on delete restrict,
  employee_id        uuid references public.employees(id) on delete restrict,
  warehouse_id       uuid references public.warehouses(id) on delete set null,
  category_id        uuid references public.categories(id) on delete set null,
  currency           text not null default 'TRY',
  exchange_rate      numeric(18,6) not null default 1 check (exchange_rate > 0),
  prices_include_vat boolean not null default false,
  discount_type      text not null default 'rate' check (discount_type in ('rate','amount')),
  discount_value     numeric(18,4) not null default 0,
  affects_stock      boolean not null default true,
  subtotal           numeric(18,2) not null default 0,  -- iskonto öncesi, KDV hariç
  discount_total     numeric(18,2) not null default 0,
  net_total          numeric(18,2) not null default 0,  -- matrah
  vat_total          numeric(18,2) not null default 0,
  total              numeric(18,2) not null default 0,
  total_try          numeric(18,2) not null default 0,
  paid_amount        numeric(18,2) not null default 0,  -- belge para biriminde
  payment_status     text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','none')),
  source_document_id uuid references public.documents(id) on delete set null,
  contact_snapshot   jsonb,       -- fatura anındaki unvan/VKN/adres
  description        text,
  notes              text,
  terms              text,
  is_printed         boolean not null default false,
  sent_at            timestamptz,
  created_by         uuid references auth.users(id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create unique index documents_number_uniq on public.documents(org_id, doc_type, number)
  where number is not null and deleted_at is null;
create index documents_org_type_date_idx on public.documents(org_id, doc_type, issue_date desc) where deleted_at is null;
create index documents_contact_idx on public.documents(contact_id) where deleted_at is null;
create index documents_due_idx on public.documents(org_id, due_date) where deleted_at is null and payment_status in ('unpaid','partial');
select private.setup_org_table('documents');

create table public.document_lines (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  document_id     uuid not null references public.documents(id) on delete cascade,
  position        int not null default 0,
  product_id      uuid references public.products(id) on delete set null,
  description     text,
  quantity        numeric(18,4) not null default 1,
  unit_id         uuid references public.units(id) on delete set null,
  unit_factor     numeric(18,6) not null default 1 check (unit_factor > 0),
  unit_price      numeric(18,4) not null default 0,
  discount_rate   numeric(7,4) not null default 0 check (discount_rate between 0 and 100),
  vat_rate        numeric(5,2) not null default 20,
  -- hesaplanan alanlar (recalc_document)
  gross_amount    numeric(18,2) not null default 0,  -- KDV hariç, iskontosuz
  discount_amount numeric(18,2) not null default 0,  -- satır + genel iskonto payı
  net_amount      numeric(18,2) not null default 0,  -- matrah
  vat_amount      numeric(18,2) not null default 0,
  total_amount    numeric(18,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index document_lines_doc_idx on public.document_lines(document_id, position);
create index document_lines_product_idx on public.document_lines(product_id);
select private.setup_org_table('document_lines');

-- ---------------------------------------------------------------------
-- Depo transferleri
-- ---------------------------------------------------------------------
create table public.stock_transfers (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  number            text,
  transfer_date     date not null default current_date,
  from_warehouse_id uuid not null references public.warehouses(id),
  to_warehouse_id   uuid not null references public.warehouses(id),
  description       text,
  created_by        uuid references auth.users(id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  check (from_warehouse_id <> to_warehouse_id)
);
select private.setup_org_table('stock_transfers');

-- ---------------------------------------------------------------------
-- Stok hareketleri (ana birim cinsinden, işaretli miktar)
-- ---------------------------------------------------------------------
create table public.stock_movements (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  product_id       uuid not null references public.products(id) on delete cascade,
  warehouse_id     uuid not null references public.warehouses(id),
  movement_date    date not null default current_date,
  movement_type    text not null check (movement_type in (
                     'opening','purchase','sale','sales_return','purchase_return',
                     'transfer_in','transfer_out','adjustment','count')),
  quantity         numeric(18,4) not null,    -- + giriş / - çıkış
  unit_cost        numeric(18,4),             -- TL (girişlerde)
  document_id      uuid references public.documents(id) on delete cascade,
  document_line_id uuid references public.document_lines(id) on delete cascade,
  transfer_id      uuid references public.stock_transfers(id) on delete cascade,
  description      text,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index stock_movements_product_idx on public.stock_movements(product_id, movement_date);
create index stock_movements_doc_idx on public.stock_movements(document_id);
select private.setup_org_table('stock_movements');

-- Stok miktarı + ağırlıklı ortalama maliyet
create or replace function public.tg_stock_movement_apply()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_old_qty numeric;
  v_old_avg numeric;
begin
  -- eski etkiyi geri al
  if tg_op in ('UPDATE','DELETE') and old.deleted_at is null then
    update public.product_stocks
       set quantity = quantity - old.quantity, updated_at = now()
     where product_id = old.product_id and warehouse_id = old.warehouse_id;
    update public.products set stock_qty = stock_qty - old.quantity, updated_at = now()
     where id = old.product_id;
  end if;

  -- yeni etkiyi uygula
  if tg_op in ('INSERT','UPDATE') and new.deleted_at is null then
    -- ortalama maliyet: yalnızca maliyetli girişlerde
    if new.quantity > 0 and new.unit_cost is not null
       and new.movement_type in ('opening','purchase','adjustment','count')
       and (tg_op = 'INSERT' or old.deleted_at is not null or old.quantity <> new.quantity or old.unit_cost is distinct from new.unit_cost) then
      select greatest(stock_qty, 0), avg_cost into v_old_qty, v_old_avg
        from public.products where id = new.product_id for update;
      update public.products
         set avg_cost = case when v_old_qty + new.quantity > 0
                             then round((v_old_qty * v_old_avg + new.quantity * new.unit_cost) / (v_old_qty + new.quantity), 4)
                             else new.unit_cost end
       where id = new.product_id;
    end if;

    insert into public.product_stocks (org_id, product_id, warehouse_id, quantity)
    values (new.org_id, new.product_id, new.warehouse_id, new.quantity)
    on conflict (product_id, warehouse_id)
    do update set quantity = public.product_stocks.quantity + excluded.quantity, updated_at = now();
    update public.products set stock_qty = stock_qty + new.quantity, updated_at = now()
     where id = new.product_id;
  end if;

  return null;
end;
$$;

create trigger stock_movements_apply
  after insert or update or delete on public.stock_movements
  for each row execute function public.tg_stock_movement_apply();
