-- =====================================================================
-- 008 · Fonksiyon yetkileri: PUBLIC/anon erişimini kapat, yalnızca gerekenleri authenticated'a aç
-- =====================================================================

-- Tetikleyici fonksiyonları: kimse doğrudan çağıramaz (tetikleyiciler yine çalışır)
revoke execute on function public.tg_set_updated_at()          from public, anon, authenticated;
revoke execute on function public.handle_new_user()            from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed()      from public, anon, authenticated;
revoke execute on function public.tg_stock_movement_apply()    from public, anon, authenticated;
revoke execute on function public.tg_transaction_balance()     from public, anon, authenticated;
revoke execute on function public.tg_allocation_refresh()      from public, anon, authenticated;
revoke execute on function public.tg_transaction_refresh_docs() from public, anon, authenticated;
revoke execute on function public.tg_audit()                   from public, anon, authenticated;

-- İç fonksiyonlar
revoke execute on function public.recalc_document(uuid)          from public, anon, authenticated;
revoke execute on function public.post_document_stock(uuid)      from public, anon, authenticated;
revoke execute on function public.refresh_document_payment(uuid) from public, anon, authenticated;

-- Oturum açmış kullanıcılar için API fonksiyonları
do $$
declare f text;
begin
  foreach f in array array[
    'public.is_member(uuid)',
    'public.has_role(uuid, text[])',
    'public.can_write(uuid)',
    'public.is_admin(uuid)',
    'public.accept_invitation(text)',
    'public.create_organization(text, text, jsonb)',
    'public.next_document_number(uuid, text, date)',
    'public.save_document(jsonb, jsonb)',
    'public.delete_document(uuid)',
    'public.save_transaction(jsonb, jsonb)',
    'public.dashboard_summary(uuid, date)',
    'public.latest_rate(text, date)',
    'public.document_stock_sign(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
