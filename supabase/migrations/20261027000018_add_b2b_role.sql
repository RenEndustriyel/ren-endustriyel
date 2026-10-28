-- B2B rolünü memberships ve invitations tablolarına ekleme
alter table public.memberships drop constraint if exists memberships_role_check;
alter table public.memberships add constraint memberships_role_check check (role in ('owner','admin','staff','accountant','b2b'));

alter table public.invitations drop constraint if exists invitations_role_check;
alter table public.invitations add constraint invitations_role_check check (role in ('owner','admin','staff','accountant','b2b'));
