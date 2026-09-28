-- =====================================================================
-- 009 · RLS performansı: auth.uid() satır başına değil sorgu başına bir kez
-- =====================================================================

alter policy profiles_select on public.profiles
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.memberships a
      join public.memberships b on a.org_id = b.org_id
      where a.user_id = (select auth.uid()) and b.user_id = profiles.id
    )
  );
alter policy profiles_update on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy memberships_select on public.memberships
  using (user_id = (select auth.uid()) or public.is_member(org_id));
alter policy memberships_delete on public.memberships
  using ((public.is_admin(org_id) and role <> 'owner') or user_id = (select auth.uid()));
alter policy push_subscriptions_own on public.push_subscriptions
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
