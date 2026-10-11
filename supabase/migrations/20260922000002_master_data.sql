-- =====================================================================
-- 002 · Ana veriler: birimler, kategoriler, cariler, depolar, ürünler, fiyat listeleri
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Firma tablolarına standart RLS + updated_at uygular.
--   p_write: 'member' -> owner/admin/staff yazar ; 'admin' -> sadece owner/admin yazar
create or replace function private.setup_org_table(p_table text, p_write text default 'member')
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_fn text := case p_write when 'admin' then 'public.is_admin' else 'public.can_write' end;
begin
  execute format('alter table public.%I enable row level security', p_table);
  execute format('create policy %I on public.%I for select to authenticated using (public.is_member(org_id))',
                 p_table || '_select', p_table);
  execute format('create policy %I on public.%I for insert to authenticated with check (%s(org_id))',
                 p_table || '_insert', p_table, v_fn);
  execute format('create policy %I on public.%I for update to authenticated using (%s(org_id)) with check (%s(org_id))',
                 p_table || '_update', p_table, v_fn, v_fn);
  execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin(org_id))',
                 p_table || '_delete', p_table);
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = p_table and column_name = 'updated_at') then
    execute format('create trigger %I before update on public.%I for each row execute function public.tg_set_updated_at()',
                   p_table || '_updated_at', p_table);
    execute format('create index %I on public.%I (org_id, updated_at)', p_table || '_sync_idx', p_table);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Birimler
-- ---------------------------------------------------------------------
create table public.units (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null,
  code       text not null,
  decimals   smallint not null default 2,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (org_id, code)
);
select private.setup_org_table('units');

-- ---------------------------------------------------------------------
-- Kategoriler (ürün / masraf / gelir / cari)
-- ---------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  type       text not null check (type in ('product','expense','income','contact','employee')),
  name       text not null,
  color      text,
  parent_id  uuid references public.categories(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index categories_org_type_idx on public.categories(org_id, type);
select private.setup_org_table('categories');

-- ---------------------------------------------------------------------
-- Depolar
-- ---------------------------------------------------------------------
create table public.warehouses (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null,
  address    text,
  is_default boolean not null default false,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index warehouses_one_default on public.warehouses(org_id) where is_default and deleted_at is null;
select private.setup_org_table('warehouses', 'admin');

-- ---------------------------------------------------------------------
-- Fiyat listeleri
-- ---------------------------------------------------------------------
create table public.price_lists (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  currency      text not null default 'TRY',
  includes_vat  boolean not null default false,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
select private.setup_org_table('price_lists');

-- ---------------------------------------------------------------------
-- Cariler (müşteri + tedarikçi tek kart)
-- ---------------------------------------------------------------------
create table public.contacts (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.organizations(id) on delete cascade,
  kind                 text not null default 'customer' check (kind in ('customer','supplier','both')),
  entity_type          text not null default 'company' check (entity_type in ('company','person')),
  code                 text,
  name                 text not null check (length(trim(name)) > 0),
  short_name           text,
  tax_number           text,               -- VKN veya TCKN
  tax_office           text,
  email                text,
  phone                text,
  mobile               text,
  address              text,
  district             text,
  city                 text,
  country              text default 'Türkiye',
  iban                 text,
  contact_person       text,
  currency             text not null default 'TRY',
  payment_term_days    int,
  price_list_id        uuid references public.price_lists(id) on delete set null,
  category_id          uuid references public.categories(id) on delete set null,
  tags                 text[] not null default '{}',
  notes                text,
  opening_balance      numeric(18,2) not null default 0,  -- + : bize borçlu (alacak) / - : biz borçluyuz
  opening_balance_date date,
  is_active            boolean not null default true,
  created_by           uuid references auth.users(id) on delete set null default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);
create index contacts_org_kind_idx on public.contacts(org_id, kind) where deleted_at is null;
create index contacts_name_trgm on public.contacts using gin (name extensions.gin_trgm_ops);
create unique index contacts_code_uniq on public.contacts(org_id, code) where code is not null and deleted_at is null;
select private.setup_org_table('contacts');

-- ---------------------------------------------------------------------
-- Ürün ve hizmetler
-- ---------------------------------------------------------------------
create table public.products (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  type                    text not null default 'product' check (type in ('product','service')),
  code                    text,
  name                    text not null check (length(trim(name)) > 0),
  barcode                 text,
  category_id             uuid references public.categories(id) on delete set null,
  unit_id                 uuid references public.units(id) on delete set null,
  vat_rate                numeric(5,2) not null default 20,
  sale_price              numeric(18,4) not null default 0,
  sale_price_includes_vat boolean not null default false,
  sale_currency           text not null default 'TRY',
  purchase_price          numeric(18,4) not null default 0,
  purchase_price_includes_vat boolean not null default false,
  purchase_currency       text not null default 'TRY',
  track_stock             boolean not null default true,
  critical_stock          numeric(18,4),
  stock_qty               numeric(18,4) not null default 0,   -- tetikleyici ile güncellenir
  avg_cost                numeric(18,4) not null default 0,   -- TL, ağırlıklı ortalama
  image_path              text,
  notes                   text,
  is_active               boolean not null default true,
  created_by              uuid references auth.users(id) on delete set null default auth.uid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create unique index products_code_uniq on public.products(org_id, code) where code is not null and deleted_at is null;
create unique index products_barcode_uniq on public.products(org_id, barcode) where barcode is not null and deleted_at is null;
create index products_name_trgm on public.products using gin (name extensions.gin_trgm_ops);
select private.setup_org_table('products');

-- Alternatif birimler (örn. 1 koli = 12 adet)
create table public.product_units (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_id    uuid not null references public.units(id) on delete cascade,
  factor     numeric(18,6) not null check (factor > 0),   -- 1 bu birim = factor ana birim
  barcode    text,
  sale_price numeric(18,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (product_id, unit_id)
);
select private.setup_org_table('product_units');

create table public.price_list_items (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  price         numeric(18,4) not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (price_list_id, product_id)
);
select private.setup_org_table('price_list_items');

-- Depo bazında stok (tetikleyici ile güncellenir, elle yazılmaz)
create table public.product_stocks (
  org_id       uuid not null references public.organizations(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  quantity     numeric(18,4) not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (product_id, warehouse_id)
);
alter table public.product_stocks enable row level security;
create policy product_stocks_select on public.product_stocks for select to authenticated
  using (public.is_member(org_id));
create index product_stocks_sync_idx on public.product_stocks(org_id, updated_at);
