-- =====================================================================
-- 007 · Davetler yalnızca e-postası doğrulanmış kullanıcıya otomatik bağlanır
-- =====================================================================

create or replace function private.accept_pending_invitations(p_user uuid, p_email text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_inv record;
  v_first uuid;
begin
  for v_inv in
    select * from public.invitations
    where lower(email) = lower(p_email) and accepted_at is null and expires_at > now()
    order by created_at
  loop
    insert into public.memberships (org_id, user_id, role)
    values (v_inv.org_id, p_user, v_inv.role)
    on conflict (org_id, user_id) do nothing;
    update public.invitations set accepted_at = now(), accepted_by = p_user where id = v_inv.id;
    v_first := coalesce(v_first, v_inv.org_id);
  end loop;

  if v_first is not null then
    update public.profiles set default_org_id = coalesce(default_org_id, v_first) where id = p_user;
  end if;
end;
$$;
revoke execute on function private.accept_pending_invitations(uuid, text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  if new.email_confirmed_at is not null then
    perform private.accept_pending_invitations(new.id, new.email);
  end if;
  return new;
end;
$$;

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform private.accept_pending_invitations(new.id, new.email);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- Token ile kabul: e-posta doğrulanmış olmalı
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_inv public.invitations;
  v_user auth.users;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  select * into v_user from auth.users where id = auth.uid();
  if v_user.email_confirmed_at is null then raise exception 'Önce e-posta adresinizi doğrulayın'; end if;
  select * into v_inv from public.invitations
   where token = p_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'Davet geçersiz veya süresi dolmuş'; end if;
  if lower(v_inv.email) <> lower(v_user.email) then
    raise exception 'Bu davet başka bir e-posta adresine gönderilmiş';
  end if;
  insert into public.memberships (org_id, user_id, role)
  values (v_inv.org_id, auth.uid(), v_inv.role)
  on conflict (org_id, user_id) do update set role = excluded.role;
  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  return v_inv.org_id;
end;
$$;
revoke execute on function public.accept_invitation(text) from anon;
