-- Site trafiği sayacı (kurumsal site + mağaza)
-- Kişi tanımlanmaz: IP, çerez, kullanıcı adı saklanmaz. Aynı ziyaretçiyi o gün içinde
-- bir kez saymak için sunucu, IP + tarayıcı + gün + gizli tuzdan tek yönlü bir özet üretir;
-- özet her gün değiştiği için ziyaretçi günler arasında izlenemez.
--
-- Yazma: yalnızca log_site_visit işleviyle (anon dahil), alan uzunlukları sınırlı.
-- Okuma: yalnızca site_traffic_stats ile, firma sahibi/yöneticisi.

create table if not exists public.site_visits (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  event         text not null default 'pageview',
  path          text not null,
  referrer_host text,
  device        text,
  country       text,
  city          text,
  visitor_hash  text not null
);

create index if not exists site_visits_created_idx on public.site_visits (created_at desc);

alter table public.site_visits enable row level security;
-- Politika yok: tabloya doğrudan erişim kapalı, yalnızca aşağıdaki işlevler kullanılır.
revoke all on public.site_visits from anon, authenticated;

create or replace function public.log_site_visit(
  p_event text, p_path text, p_referrer_host text, p_device text,
  p_country text, p_city text, p_visitor_hash text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event not in ('pageview', 'whatsapp', 'phone', 'teklif') then return; end if;
  if p_path is null or p_path !~ '^/' then return; end if;
  if p_path ~ '^/(panel|api|giris|kayit|davet|kurulum)' then return; end if;
  insert into public.site_visits (event, path, referrer_host, device, country, city, visitor_hash)
  values (p_event, left(p_path, 200), left(p_referrer_host, 100), left(p_device, 20),
          left(p_country, 4), left(p_city, 60), left(p_visitor_hash, 64));
end;
$$;

revoke execute on function public.log_site_visit(text, text, text, text, text, text, text) from public;
grant execute on function public.log_site_visit(text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.site_traffic_stats(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
                        - make_interval(days => greatest(1, least(p_days, 366)) - 1);
  v_today timestamptz := date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
begin
  if not exists (
    select 1 from public.memberships m where m.user_id = auth.uid() and m.role in ('owner', 'admin')
  ) then
    raise exception 'Site trafiğini yalnızca firma sahibi veya yöneticisi görebilir';
  end if;

  return jsonb_build_object(
    'live', (select count(distinct visitor_hash) from public.site_visits where created_at > now() - interval '5 minutes'),
    'today', (select jsonb_build_object('views', count(*), 'visitors', count(distinct visitor_hash))
              from public.site_visits where event = 'pageview' and created_at >= v_today),
    'total', (select jsonb_build_object('views', count(*), 'visitors', count(distinct (visitor_hash, (created_at at time zone 'Europe/Istanbul')::date)))
              from public.site_visits where event = 'pageview' and created_at >= v_from),
    'daily', coalesce((select jsonb_agg(d order by d->>'day') from (
                select jsonb_build_object('day', (created_at at time zone 'Europe/Istanbul')::date,
                                          'views', count(*), 'visitors', count(distinct visitor_hash)) d
                from public.site_visits where event = 'pageview' and created_at >= v_from
                group by (created_at at time zone 'Europe/Istanbul')::date) x), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(r) from (
                select path as name, count(*) as n from public.site_visits
                where event = 'pageview' and created_at >= v_from group by path order by n desc limit 15) r), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(r) from (
                select coalesce(referrer_host, 'Doğrudan') as name, count(distinct (visitor_hash, (created_at at time zone 'Europe/Istanbul')::date)) as n
                from public.site_visits where event = 'pageview' and created_at >= v_from group by 1 order by n desc limit 10) r), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(r) from (
                select coalesce(device, 'Bilinmiyor') as name, count(distinct (visitor_hash, (created_at at time zone 'Europe/Istanbul')::date)) as n
                from public.site_visits where event = 'pageview' and created_at >= v_from group by 1 order by n desc) r), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(r) from (
                select coalesce(city, 'Bilinmiyor') as name, count(distinct (visitor_hash, (created_at at time zone 'Europe/Istanbul')::date)) as n
                from public.site_visits where event = 'pageview' and created_at >= v_from group by 1 order by n desc limit 10) r), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(r) from (
                select event as name, count(*) as n from public.site_visits
                where event <> 'pageview' and created_at >= v_from group by event order by n desc) r), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.site_traffic_stats(int) from public, anon;
grant execute on function public.site_traffic_stats(int) to authenticated;
