-- =====================================================================
-- 001 · Çekirdek: firmalar, üyelikler, profiller, davetler, yetki yardımcıları
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Ortak tetikleyici: updated_at
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Firmalar (tenant)
-- ---------------------------------------------------------------------
create table public.organizations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) > 0),
  code             text not null default 'FRM' check (code ~ '^[A-Z0-9]{2,6}$'),
  legal_name       text,
  tax_number       text,
  tax_office       text,
  address          text,
  district         text,
  city             text,
  country          text not null default 'Türkiye',
  phone            text,
  email            text,
  website          text,
  iban             text,
  logo_path        text,
  base_currency    text not null default 'TRY',
  default_vat_rate numeric(5,2) not null default 20,
  settings         jsonb not null default '{}'::jsonb,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Profiller
-- ---------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  full_name      text,
  phone          text,
  default_org_id uuid references public.organizations(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Üyelikler ve roller
--   owner      : her şey
--   admin      : her şey (firma silme / sahiplik hariç)
--   staff      : kayıt girer; ayarlar ve kullanıcı yönetimi yok
--   accountant : salt okunur
-- ---------------------------------------------------------------------
create table public.memberships (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner','admin','staff','accountant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index memberships_user_idx on public.memberships(user_id);

create trigger memberships_updated_at before update on public.memberships
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Davetler
-- ---------------------------------------------------------------------
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('owner','admin','staff','accountant')),
  token       text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at  timestamptz not null default now() + interval '14 days',
  created_at  timestamptz not null default now()
);

create index invitations_email_idx on public.invitations(lower(email)) where accepted_at is null;

-- ---------------------------------------------------------------------
-- Yetki yardımcıları (RLS içinde kullanılır)
-- ---------------------------------------------------------------------
create or replace function public.is_member(p_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_role(p_org uuid, p_roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role = any(p_roles)
  );
$$;

create or replace function public.can_write(p_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.has_role(p_org, array['owner','admin','staff']);
$$;

create or replace function public.is_admin(p_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.has_role(p_org, array['owner','admin']);
$$;

-- ---------------------------------------------------------------------
-- RLS: çekirdek tablolar
-- ---------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.memberships   enable row level security;
alter table public.invitations   enable row level security;

create policy org_select on public.organizations for select to authenticated
  using (public.is_member(id));
create policy org_update on public.organizations for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));
create policy org_delete on public.organizations for delete to authenticated
  using (public.has_role(id, array['owner']));
-- Firma oluşturma yalnızca create_organization() RPC ile.

create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.memberships a
      join public.memberships b on a.org_id = b.org_id
      where a.user_id = auth.uid() and b.user_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_member(org_id));
create policy memberships_update on public.memberships for update to authenticated
  using (public.is_admin(org_id) and role <> 'owner')
  with check (public.is_admin(org_id) and role <> 'owner');
create policy memberships_delete on public.memberships for delete to authenticated
  using ((public.is_admin(org_id) and role <> 'owner') or user_id = auth.uid());

create policy invitations_select on public.invitations for select to authenticated
  using (public.is_admin(org_id));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (public.is_admin(org_id) and (role <> 'owner' or public.has_role(org_id, array['owner'])));
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.is_admin(org_id));

-- ---------------------------------------------------------------------
-- Yeni kullanıcı: profil oluştur + bekleyen davetleri kabul et
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_inv record;
  v_first uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  for v_inv in
    select * from public.invitations
    where lower(email) = lower(new.email) and accepted_at is null and expires_at > now()
    order by created_at
  loop
    insert into public.memberships (org_id, user_id, role)
    values (v_inv.org_id, new.id, v_inv.role)
    on conflict (org_id, user_id) do nothing;
    update public.invitations set accepted_at = now(), accepted_by = new.id where id = v_inv.id;
    v_first := coalesce(v_first, v_inv.org_id);
  end loop;

  if v_first is not null then
    update public.profiles set default_org_id = v_first where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Oturum açmış kullanıcı daveti token ile kabul eder
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_inv public.invitations;
  v_email text;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  select email into v_email from auth.users where id = auth.uid();
  select * into v_inv from public.invitations
   where token = p_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'Davet geçersiz veya süresi dolmuş'; end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'Bu davet başka bir e-posta adresine gönderilmiş';
  end if;
  insert into public.memberships (org_id, user_id, role)
  values (v_inv.org_id, auth.uid(), v_inv.role)
  on conflict (org_id, user_id) do update set role = excluded.role;
  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  return v_inv.org_id;
end;
$$;
