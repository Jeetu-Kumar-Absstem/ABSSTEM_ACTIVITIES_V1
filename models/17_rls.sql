-- Row-level security for Events / Tournaments / Leaderboard tables.
-- All tables are read-by-authenticated, write-by-admin.

alter table public.events                   enable row level security;
alter table public.tournaments              enable row level security;
alter table public.tournament_participants  enable row level security;
alter table public.tournament_matches       enable row level security;
alter table public.final_results            enable row level security;
alter table public.leaderboard              enable row level security;

-- events
drop policy if exists events_select_authenticated on public.events;
create policy events_select_authenticated
on public.events
for select
using (auth.role() = 'authenticated');

drop policy if exists events_admin_write on public.events;
create policy events_admin_write
on public.events
for all
using (app_is_admin())
with check (app_is_admin());

-- tournaments
drop policy if exists tournaments_select_authenticated on public.tournaments;
create policy tournaments_select_authenticated
on public.tournaments
for select
using (auth.role() = 'authenticated');

drop policy if exists tournaments_admin_write on public.tournaments;
create policy tournaments_admin_write
on public.tournaments
for all
using (app_is_admin())
with check (app_is_admin());

-- tournament_participants: any authenticated user can self-register / withdraw,
-- admin can manage the rest.
drop policy if exists tournament_participants_select_authenticated on public.tournament_participants;
create policy tournament_participants_select_authenticated
on public.tournament_participants
for select
using (auth.role() = 'authenticated');

drop policy if exists tournament_participants_self_insert on public.tournament_participants;
create policy tournament_participants_self_insert
on public.tournament_participants
for insert
with check (
  auth.uid() is not null
  and upper(employee_id) = app_current_emp_id()
);

drop policy if exists tournament_participants_self_update on public.tournament_participants;
create policy tournament_participants_self_update
on public.tournament_participants
for update
using (upper(employee_id) = app_current_emp_id() or app_is_admin())
with check (upper(employee_id) = app_current_emp_id() or app_is_admin());

drop policy if exists tournament_participants_self_delete on public.tournament_participants;
create policy tournament_participants_self_delete
on public.tournament_participants
for delete
using (upper(employee_id) = app_current_emp_id() or app_is_admin());

drop policy if exists tournament_participants_admin_write on public.tournament_participants;
create policy tournament_participants_admin_write
on public.tournament_participants
for all
using (app_is_admin())
with check (app_is_admin());

-- tournament_matches: read-by-auth, write-by-admin (or match participants for self-recording).
drop policy if exists tournament_matches_select_authenticated on public.tournament_matches;
create policy tournament_matches_select_authenticated
on public.tournament_matches
for select
using (auth.role() = 'authenticated');

drop policy if exists tournament_matches_admin_write on public.tournament_matches;
create policy tournament_matches_admin_write
on public.tournament_matches
for all
using (app_is_admin())
with check (app_is_admin());

drop policy if exists tournament_matches_participant_write on public.tournament_matches;
create policy tournament_matches_participant_write
on public.tournament_matches
for insert
with check (
  auth.uid() is not null
  and (
    upper(player_a_employee_id) = app_current_emp_id()
    or upper(player_b_employee_id) = app_current_emp_id()
    or app_is_admin()
  )
);

drop policy if exists tournament_matches_participant_update on public.tournament_matches;
create policy tournament_matches_participant_update
on public.tournament_matches
for update
using (
  upper(player_a_employee_id) = app_current_emp_id()
  or upper(player_b_employee_id) = app_current_emp_id()
  or app_is_admin()
)
with check (
  upper(player_a_employee_id) = app_current_emp_id()
  or upper(player_b_employee_id) = app_current_emp_id()
  or app_is_admin()
);

-- final_results: read-by-auth, write-by-admin.
drop policy if exists final_results_select_authenticated on public.final_results;
create policy final_results_select_authenticated
on public.final_results
for select
using (auth.role() = 'authenticated');

drop policy if exists final_results_admin_write on public.final_results;
create policy final_results_admin_write
on public.final_results
for all
using (app_is_admin())
with check (app_is_admin());

-- leaderboard: read-by-auth, write-by-admin (or via leaderboard_apply() helper).
drop policy if exists leaderboard_select_authenticated on public.leaderboard;
create policy leaderboard_select_authenticated
on public.leaderboard
for select
using (auth.role() = 'authenticated');

drop policy if exists leaderboard_admin_write on public.leaderboard;
create policy leaderboard_admin_write
on public.leaderboard
for all
using (app_is_admin())
with check (app_is_admin());
