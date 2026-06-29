alter table public.employees enable row level security;
alter table public.games enable row level security;
alter table public.slots enable row level security;
alter table public.bans enable row level security;
alter table public.rules enable row level security;
alter table public.bookings enable row level security;
alter table public.violations enable row level security;

drop policy if exists employees_select_all on public.employees;
create policy employees_select_all
on public.employees
for select
using (auth.role() = 'authenticated' or auth.role() = 'anon');

drop policy if exists employees_insert_auth on public.employees;
create policy employees_insert_auth
on public.employees
for insert
with check (auth.uid() is not null);

drop policy if exists employees_update_self_or_admin on public.employees;
create policy employees_update_self_or_admin
on public.employees
for update
using (app_is_admin() or upper(employee_code) = app_current_emp_id())
with check (app_is_admin() or upper(employee_code) = app_current_emp_id());

drop policy if exists employees_delete_admin_only on public.employees;
create policy employees_delete_admin_only
on public.employees
for delete
using (app_is_admin());

drop policy if exists games_select_all on public.games;
create policy games_select_all
on public.games
for select
using (auth.role() = 'authenticated' or auth.role() = 'anon');

drop policy if exists games_admin_write on public.games;
create policy games_admin_write
on public.games
for all
using (app_is_admin())
with check (app_is_admin());

drop policy if exists slots_select_all on public.slots;
create policy slots_select_all
on public.slots
for select
using (auth.role() = 'authenticated' or auth.role() = 'anon');

drop policy if exists slots_admin_write on public.slots;
create policy slots_admin_write
on public.slots
for all
using (app_is_admin())
with check (app_is_admin());

drop policy if exists bans_select_authenticated on public.bans;
create policy bans_select_authenticated
on public.bans
for select
using (auth.role() = 'authenticated');

drop policy if exists bans_admin_write on public.bans;
create policy bans_admin_write
on public.bans
for all
using (app_is_admin())
with check (app_is_admin());

drop policy if exists rules_select_all on public.rules;
create policy rules_select_all
on public.rules
for select
using (auth.role() = 'authenticated' or auth.role() = 'anon');

drop policy if exists rules_admin_write on public.rules;
create policy rules_admin_write
on public.rules
for all
using (app_is_admin())
with check (app_is_admin());

drop policy if exists bookings_select_authenticated on public.bookings;
create policy bookings_select_authenticated
on public.bookings
for select
using (auth.role() = 'authenticated');

drop policy if exists bookings_insert_authenticated on public.bookings;
create policy bookings_insert_authenticated
on public.bookings
for insert
with check (auth.uid() is not null);

drop policy if exists bookings_update_owner_or_admin on public.bookings;
create policy bookings_update_owner_or_admin
on public.bookings
for update
using (app_is_admin() or user_id = auth.uid())
with check (app_is_admin() or user_id = auth.uid());

drop policy if exists bookings_delete_owner_or_admin on public.bookings;
create policy bookings_delete_owner_or_admin
on public.bookings
for delete
using (app_is_admin() or user_id = auth.uid());

drop policy if exists violations_select_authenticated on public.violations;
create policy violations_select_authenticated
on public.violations
for select
using (auth.role() = 'authenticated');

drop policy if exists violations_admin_write on public.violations;
create policy violations_admin_write
on public.violations
for all
using (app_is_admin())
with check (app_is_admin());
