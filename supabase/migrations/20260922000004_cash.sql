-- =====================================================================
-- 004 · Nakit: kasa/banka/kredi kartı hesapları, hareketler, belge eşleştirme, çek & senet
-- =====================================================================

create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  type            text not null check (type in ('cash','bank','credit_card')),
  name            text not null,
  currency        text not null default 'TRY',
  bank_name       text,
  branch          text,
  account_number  text,
  iban            text,
  card_limit      numeric(18,2),
  statement_day   smallint check (statement_day between 1 and 31),
  due_day         smallint check (due_day between 1 and 31),
  balance         numeric(18,2) not null default 0,   -- tetikleyici ile güncellenir
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
select private.setup_org_table('accounts', 'admin');

-- ---------------------------------------------------------------------
-- Çek & senet
-- ---------------------------------------------------------------------
create table public.cheques (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  kind           text not null check (kind in ('cheque','note')),          -- çek / senet
  direction      text not null check (direction in ('received','issued')), -- alınan / verilen
  serial_number  text,
  bank_name      text,
  branch         text,
  account_number text,
  drawer         text,          -- keşideci / borçlu
  contact_id     uuid references public.contacts(id) on delete restrict,
  amount         numeric(18,2) not null check (amount > 0),
  currency       text not null default 'TRY',
  exchange_rate  numeric(18,6) not null default 1,
  issue_date     date not null default current_date,
  due_date       date not null,
  status         text not null default 'portfolio' check (status in (
                   'portfolio',   -- portföyde (alınan) / ödenecek (verilen)
                   'deposited',   -- bankaya tahsile verildi
                   'collected',   -- tahsil edildi
                   'paid',        -- (verilen) ödendi
                   'bounced',     -- karşılıksız / protestolu
                   'returned',    -- iade edildi
                   'cancelled')),
  account_id     uuid references public.accounts(id) on delete set null,  -- tahsil/ödeme hesabı
  image_path     text,
  notes          text,
  created_by     uuid references auth.users(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index cheques_due_idx on public.cheques(org_id, due_date) where deleted_at is null;
select private.setup_org_table('cheques');

create table public.cheque_events (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  cheque_id  uuid not null references public.cheques(id) on delete cascade,
  event_date date not null default current_date,
  status     text not null,
  note       text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.setup_org_table('cheque_events');

-- ---------------------------------------------------------------------
-- Para hareketleri
--   direction in       : hesaba giriş (tahsilat)
--   direction out      : hesaptan çıkış (ödeme)
--   direction transfer : virman (account_id -> to_account_id)
--   account_id boş olabilir: örn. çek ile tahsilat (para portföyde)
-- ---------------------------------------------------------------------
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  type           text not null check (type in (
                   'collection','payment','transfer','opening','adjustment',
                   'salary','advance','cheque_in','cheque_out','cheque_collect','cheque_pay',
                   'other_income','other_expense')),
  direction      text not null check (direction in ('in','out','transfer')),
  txn_date       date not null default current_date,
  account_id     uuid references public.accounts(id) on delete restrict,
  to_account_id  uuid references public.accounts(id) on delete restrict,
  contact_id     uuid references public.contacts(id) on delete restrict,
  employee_id    uuid references public.employees(id) on delete restrict,
  cheque_id      uuid references public.cheques(id) on delete set null,
  category_id    uuid references public.categories(id) on delete set null,
  amount         numeric(18,2) not null check (amount > 0),   -- account_id para biriminde
  to_amount      numeric(18,2),                                -- virmanda hedef tutar
  currency       text not null default 'TRY',
  exchange_rate  numeric(18,6) not null default 1 check (exchange_rate > 0),
  amount_try     numeric(18,2) generated always as (round(amount * exchange_rate, 2)) stored,
  method         text check (method in ('cash','bank_transfer','credit_card','cheque','note','other')),
  description    text,
  reference      text,
  created_by     uuid references auth.users(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  check (direction <> 'transfer' or (account_id is not null and to_account_id is not null and account_id <> to_account_id))
);
create index transactions_org_date_idx on public.transactions(org_id, txn_date desc) where deleted_at is null;
create index transactions_account_idx on public.transactions(account_id, txn_date) where deleted_at is null;
create index transactions_contact_idx on public.transactions(contact_id) where deleted_at is null;
select private.setup_org_table('transactions');

create or replace function public.tg_transaction_balance()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.deleted_at is null then
    if old.account_id is not null then
      update public.accounts
         set balance = balance - case old.direction when 'in' then old.amount else -old.amount end
       where id = old.account_id;
    end if;
    if old.direction = 'transfer' then
      update public.accounts set balance = balance - coalesce(old.to_amount, old.amount)
       where id = old.to_account_id;
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') and new.deleted_at is null then
    if new.account_id is not null then
      update public.accounts
         set balance = balance + case new.direction when 'in' then new.amount else -new.amount end
       where id = new.account_id;
    end if;
    if new.direction = 'transfer' then
      update public.accounts set balance = balance + coalesce(new.to_amount, new.amount)
       where id = new.to_account_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger transactions_balance
  after insert or update or delete on public.transactions
  for each row execute function public.tg_transaction_balance();

-- ---------------------------------------------------------------------
-- Tahsilat/ödeme ↔ belge eşleştirme (kısmi tahsilat)
--   amount: belge para biriminde
-- ---------------------------------------------------------------------
create table public.payment_allocations (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  document_id    uuid not null references public.documents(id) on delete cascade,
  amount         numeric(18,2) not null check (amount > 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (transaction_id, document_id)
);
create index payment_allocations_doc_idx on public.payment_allocations(document_id);
select private.setup_org_table('payment_allocations');

create or replace function public.refresh_document_payment(p_doc uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_paid numeric;
begin
  select coalesce(sum(pa.amount), 0) into v_paid
    from public.payment_allocations pa
    join public.transactions t on t.id = pa.transaction_id and t.deleted_at is null
   where pa.document_id = p_doc;

  update public.documents d
     set paid_amount = v_paid,
         payment_status = case
           when d.doc_type in ('quote','sales_order','purchase_order','sales_delivery','purchase_delivery') then 'none'
           when v_paid <= 0 then 'unpaid'
           when v_paid + 0.009 >= d.total then 'paid'
           else 'partial' end
   where d.id = p_doc;
end;
$$;

create or replace function public.tg_allocation_refresh()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE','DELETE') then perform public.refresh_document_payment(old.document_id); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.refresh_document_payment(new.document_id); end if;
  return null;
end;
$$;

create trigger payment_allocations_refresh
  after insert or update or delete on public.payment_allocations
  for each row execute function public.tg_allocation_refresh();

-- Hareket silinince/geri gelince bağlı belgeleri yenile
create or replace function public.tg_transaction_refresh_docs()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare r record;
begin
  if old.deleted_at is distinct from new.deleted_at then
    for r in select document_id from public.payment_allocations where transaction_id = new.id loop
      perform public.refresh_document_payment(r.document_id);
    end loop;
  end if;
  return null;
end;
$$;

create trigger transactions_refresh_docs
  after update on public.transactions
  for each row execute function public.tg_transaction_refresh_docs();
