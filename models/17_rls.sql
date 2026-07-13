-- ============================================================
-- 17_rls_fixed.sql
-- Fixes two issues:
--   1. Statement timeout caused by `auth.role()` being evaluated
--      per-row. Wrapping it in (select auth.role()) makes it
--      evaluate once per query — dramatically faster.
--   2. Drops the now-redundant app_is_admin / app_current_emp_id
--      dependency from SELECT policies (they only need auth check).
-- ============================================================

-- ── events ───────────────────────────────────────────────────
drop policy if exists events_select_authenticated on public.events;
create policy events_select_authenticated
  on public.events
  for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists events_admin_write on public.events;
create policy events_admin_write
  on public.events
  for all
  using (app_is_admin())
  with check (app_is_admin());

-- ── tournaments ───────────────────────────────────────────────
drop policy if exists tournaments_select_authenticated on public.tournaments;
create policy tournaments_select_authenticated
  on public.tournaments
  for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists tournaments_admin_write on public.tournaments;
create policy tournaments_admin_write
  on public.tournaments
  for all
  using (app_is_admin())
  with check (app_is_admin());

-- ── tournament_participants ───────────────────────────────────
drop policy if exists tournament_participants_select_authenticated on public.tournament_participants;
create policy tournament_participants_select_authenticated
  on public.tournament_participants
  for select
  using ((select auth.role()) = 'authenticated');

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

-- ── tournament_matches ────────────────────────────────────────
drop policy if exists tournament_matches_select_authenticated on public.tournament_matches;
create policy tournament_matches_select_authenticated
  on public.tournament_matches
  for select
  using ((select auth.role()) = 'authenticated');

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

-- ── final_results ─────────────────────────────────────────────
drop policy if exists final_results_select_authenticated on public.final_results;
create policy final_results_select_authenticated
  on public.final_results
  for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists final_results_admin_write on public.final_results;
create policy final_results_admin_write
  on public.final_results
  for all
  using (app_is_admin())
  with check (app_is_admin());

-- ── leaderboard ───────────────────────────────────────────────
drop policy if exists leaderboard_select_authenticated on public.leaderboard;
create policy leaderboard_select_authenticated
  on public.leaderboard
  for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists leaderboard_admin_write on public.leaderboard;
create policy leaderboard_admin_write
  on public.leaderboard
  for all
  using (app_is_admin())
  with check (app_is_admin());


-- ============================================================
-- Also create app_is_admin() and app_current_emp_id() if they
-- don't exist yet — the write policies depend on them.
-- Safe to re-run: uses CREATE OR REPLACE.
-- ============================================================

-- Returns the emp_id claim from the current user's JWT metadata.
-- Supabase stores custom signup fields under raw_user_meta_data.
create or replace function public.app_current_emp_id()
returns text
language sql
stable
security definer
as $$
  select upper(
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'emp_id'),
      (auth.jwt() -> 'user_metadata' ->> 'employee_code'),
      ''
    )
  );
$$;

-- Returns true when the current JWT belongs to an admin employee.
-- Mirror the admin IDs from your frontend isAdminId() util here.
-- Add / remove IDs to match your actual admin list.
create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
as $$
  select app_current_emp_id() = any(
    array['ATEMP157', 'ABSE1022', 'ABCD1234', 'ATEMP139']::text[]
  );
$$;