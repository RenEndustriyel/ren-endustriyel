-- =====================================================================
-- 012 · Zamanlanmış görevler: TCMB kurları, hatırlatma bildirimleri, günlük özet
--   Not: 'cron_secret' Vault'a ayrıca eklenir (depoya yazılmaz):
--        select vault.create_secret('<gizli>', 'cron_secret');
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function private.call_edge(p_function text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1;
  return net.http_post(
    url := 'https://araetdkscwosdbwdemlk.supabase.co/functions/v1/' || p_function,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', coalesce(v_secret, '')),
    body := p_body,
    timeout_milliseconds := 30000
  );
end;
$$;
revoke execute on function private.call_edge(text, jsonb) from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobname) from cron.job where jobname in ('fetch-rates-morning', 'fetch-rates-afternoon', 'send-reminders', 'daily-digest');
end $$;

-- TCMB kurları: hafta içi 10:00 ve 15:45 (TR) = 07:00 ve 12:45 UTC
select cron.schedule('fetch-rates-morning',   '0 7 * * 1-5',  $$select private.call_edge('fetch-rates')$$);
select cron.schedule('fetch-rates-afternoon', '45 12 * * 1-5', $$select private.call_edge('fetch-rates')$$);
-- Hatırlatmalar: 10 dakikada bir
select cron.schedule('send-reminders', '*/10 * * * *', $$select private.call_edge('send-reminders')$$);
-- Günlük özet: her gün 08:30 (TR) = 05:30 UTC
select cron.schedule('daily-digest', '30 5 * * *', $$select private.call_edge('send-reminders', '{"digest": true}'::jsonb)$$);
