-- Admin allow-list
-- Source of truth for who counts as an admin throughout the app.
-- The client keeps a mirror list in src/utils/admin.js for fast UI checks
-- (so admin buttons appear immediately on first paint), but the database's
-- `public.app_is_admin()` is the authoritative check at write time.
-- Keep these two lists in sync.

create table if not exists public.app_admins (
  emp_id text primary key,
  added_at timestamptz not null default now()
);

insert into public.app_admins (emp_id) values
  ('atemp157'),
  ('ABSE1022'),
  ('ABCD1234'),
  ('atemp139')
on conflict (emp_id) do nothing;

alter table public.app_admins enable row level security;

drop policy if exists app_admins_select_authenticated on public.app_admins;
create policy app_admins_select_authenticated
on public.app_admins
for select
using (auth.role() = 'authenticated');

drop policy if exists app_admins_admin_write on public.app_admins;
create policy app_admins_admin_write
on public.app_admins
for all
using (public.app_is_admin())
with check (public.app_is_admin());
