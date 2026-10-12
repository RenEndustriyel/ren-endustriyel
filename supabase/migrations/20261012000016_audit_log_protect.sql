-- İşlem geçmişi (audit_log) koruması ve hızlandırma
-- Kullanıcı kararı (2026-10-12): bu kayıtlar hiçbir koşulda silinmemeli.
--
-- 1) Silme ve değiştirme veritabanı düzeyinde engellenir (uygulama, "Verileri sıfırla" ve
--    reset_organization_data dahil). Hata vermez; satır sessizce yerinde kalır, böylece
--    sıfırlama işlevi çalışmaya devam eder ama geçmişe dokunamaz.
-- 2) Rapor sorguları için tablo adına göre indeks.
--
-- Mevcut kayıt tetikleyicisine (tg_audit) bilerek dokunulmaz: o işlev her kayıtta çalışır,
-- denenmemiş bir değişiklik tüm kayıt işlemlerini bozabilir.

create or replace function public.tg_audit_log_protect()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- BEFORE tetikleyicide null dönmek satırdaki silme/güncellemeyi iptal eder
  return null;
end;
$$;

drop trigger if exists audit_log_protect on public.audit_log;
create trigger audit_log_protect
  before update or delete on public.audit_log
  for each row execute function public.tg_audit_log_protect();

revoke execute on function public.tg_audit_log_protect() from public, anon, authenticated;

create index if not exists audit_log_org_table_idx
  on public.audit_log (org_id, table_name, created_at desc);
