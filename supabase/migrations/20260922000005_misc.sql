-- =====================================================================
-- 005 · Hatırlatmalar/ajanda, ekler, döviz kurları, banka ekstresi, push, işlem geçmişi, dosya deposu
-- =====================================================================

-- ---------------------------------------------------------------------
-- Hatırlatmalar & ajanda
-- ---------------------------------------------------------------------
create table public.reminders (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  kind         text not null default 'reminder' check (kind in ('reminder','note','event')),
  title        text not null,
  description  text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  all_day      boolean not null default false,
  remind_at    timestamptz,             -- push bildirimi zamanı
  repeat_rule  text check (repeat_rule in ('daily','weekly','monthly','yearly')),
  color        text,
  is_done      boolean not null default false,
  notified_at  timestamptz,
  related_type text,                    -- 'document' | 'cheque' | 'contact' ...
  related_id   uuid,
  assigned_to  uuid references auth.users(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index reminders_org_start_idx on public.reminders(org_id, starts_at) where deleted_at is null;
create index reminders_due_push_idx on public.reminders(remind_at) where notified_at is null and deleted_at is null and not is_done;
select private.setup_org_table('reminders');

-- ---------------------------------------------------------------------
-- Ekler (Storage: files/{org_id}/...)
-- ---------------------------------------------------------------------
create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  entity_type  text not null,   -- 'document' | 'transaction' | 'cheque' | 'contact' | 'product' | 'employee'
  entity_id    uuid not null,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index attachments_entity_idx on public.attachments(entity_type, entity_id);
select private.setup_org_table('attachments');

-- ---------------------------------------------------------------------
-- Döviz kurları (TCMB, tüm firmalar için ortak)
-- ---------------------------------------------------------------------
create table public.exchange_rates (
  rate_date       date not null,
  currency        text not null,
  forex_buying    numeric(18,6),
  forex_selling   numeric(18,6),
  banknote_buying numeric(18,6),
  banknote_selling numeric(18,6),
  source          text not null default 'TCMB',
  created_at      timestamptz not null default now(),
  primary key (rate_date, currency)
);
alter table public.exchange_rates enable row level security;
create policy exchange_rates_select on public.exchange_rates for select to authenticated using (true);

create or replace function public.latest_rate(p_currency text, p_date date default current_date)
returns numeric
language sql stable
set search_path = ''
as $$
  select case when p_currency = 'TRY' then 1::numeric else
    (select forex_buying from public.exchange_rates
      where currency = p_currency and rate_date <= p_date
      order by rate_date desc limit 1)
  end;
$$;

-- ---------------------------------------------------------------------
-- Banka ekstresi içe aktarma
-- ---------------------------------------------------------------------
create table public.bank_statement_imports (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  account_id  uuid not null references public.accounts(id) on delete cascade,
  file_name   text,
  period_from date,
  period_to   date,
  row_count   int not null default 0,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
select private.setup_org_table('bank_statement_imports');

create table public.bank_statement_lines (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  import_id      uuid not null references public.bank_statement_imports(id) on delete cascade,
  line_date      date not null,
  description    text,
  amount         numeric(18,2) not null,     -- + giriş / - çıkış
  balance        numeric(18,2),
  reference      text,
  status         text not null default 'pending' check (status in ('pending','matched','created','ignored')),
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index bank_statement_lines_import_idx on public.bank_statement_lines(import_id);
select private.setup_org_table('bank_statement_lines');

-- ---------------------------------------------------------------------
-- Web Push abonelikleri
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- İşlem geçmişi (audit log)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id         bigint generated always as identity primary key,
  org_id     uuid not null references public.organizations(id) on delete cascade,
  table_name text not null,
  record_id  uuid,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  user_id    uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log(org_id, created_at desc);
create index audit_log_record_idx on public.audit_log(record_id);
alter table public.audit_log enable row level security;
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_admin(org_id) or public.has_role(org_id, array['accountant']));

create or replace function public.tg_audit()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (org_id, table_name, record_id, action, old_data, new_data)
  values (
    coalesce(new.org_id, old.org_id),
    tg_table_name,
    coalesce(new.id, old.id),
    case
      when tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then 'DELETE'
      when tg_op = 'UPDATE' and old.deleted_at is not null and new.deleted_at is null then 'RESTORE'
      else tg_op end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['contacts','products','documents','transactions','accounts','cheques','employees','stock_transfers']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_audit()',
                   t || '_audit', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Dosya deposu: files/{org_id}/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('files', 'files', false, 10485760,
        array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/pdf',
              'text/csv','application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create or replace function private.storage_org(p_name text)
returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end;
$$;
grant usage on schema private to authenticated;
grant execute on function private.storage_org(text) to authenticated;

create policy files_select on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.is_member(private.storage_org(name)));
create policy files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and public.can_write(private.storage_org(name)));
create policy files_update on storage.objects for update to authenticated
  using (bucket_id = 'files' and public.can_write(private.storage_org(name)));
create policy files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'files' and public.can_write(private.storage_org(name)));
