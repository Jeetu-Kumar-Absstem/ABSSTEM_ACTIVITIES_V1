-- ABSSTEM Activities schema
-- Final contract for booking grid, bans, rules, slot master, and game master.
-- This file is written to be idempotent for a Supabase database.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.app_current_emp_id()
returns text
language sql
stable
as $$
  select upper(coalesce(auth.jwt() -> 'user_metadata' ->> 'emp_id', ''));
$$;

create or replace function public.app_is_admin()
returns boolean
language sql
stable
as $$
  select app_current_emp_id() = any (array['ABCD1234', 'ABCD6789']);
$$;

create or replace function public.resolve_game_id(p_value text)
returns text
language sql
stable
as $$
  select g.id::text
  from public.games g
  where lower(g.id::text) = lower(trim(coalesce(p_value, '')))
     or lower(g.name) = lower(trim(coalesce(p_value, '')))
  limit 1;
$$;

create or replace function public.is_employee_banned(
  p_employee_id text,
  p_game text,
  p_on_date date default current_date
)
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from public.bans b
    where upper(coalesce(b.employee_id, '')) = upper(coalesce(p_employee_id, ''))
      and coalesce(b.active, true)
      and p_on_date between coalesce(b.from_date, p_on_date) and coalesce(b.until_date, p_on_date)
      and (
        lower(coalesce(b.game, '')) in ('all games', 'all', '*')
        or lower(coalesce(b.game, '')) = lower(coalesce(p_game, ''))
        or lower(coalesce(b.game, '')) = lower(coalesce(public.resolve_game_id(p_game), ''))
      )
  );
end;
$$;

create or replace function public.booking_capacity(p_slot_id bigint, p_game text)
returns integer
language plpgsql
stable
as $$
declare
  v_slot record;
  v_game record;
begin
  select * into v_slot from public.slots where id = p_slot_id limit 1;
  if found and coalesce(v_slot.max_players, 0) > 0 then
    return v_slot.max_players;
  end if;

  select * into v_game
  from public.games
  where id::text = public.resolve_game_id(p_game)
  limit 1;

  if found and coalesce(v_game.max_players, 0) > 0 then
    return v_game.max_players;
  end if;

  return 4;
end;
$$;

create or replace function public.validate_booking_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp_id text := upper(coalesce(nullif(new.employee_id, ''), public.app_current_emp_id()));
  v_game_id text := public.resolve_game_id(new.game);
  v_slot record;
  v_game record;
  v_capacity integer;
  v_existing integer;
begin
  if v_emp_id = '' then
    raise exception 'Employee ID is required';
  end if;

  if new.user_id is null then
    raise exception 'User ID is required';
  end if;

  if new.day is null or btrim(new.day) = '' then
    raise exception 'Booking day is required';
  end if;

  if new.slot_id is null then
    raise exception 'Slot is required';
  end if;

  if v_game_id is null then
    raise exception 'Selected game is unavailable';
  end if;

  select * into v_game from public.games where id::text = v_game_id limit 1;
  if not found or coalesce(v_game.active, true) = false then
    raise exception 'Currently this is Unavailable';
  end if;

  select * into v_slot from public.slots where id = new.slot_id limit 1;
  if not found then
    raise exception 'Slot does not exist';
  end if;

  if coalesce(v_slot.active, true) = false then
    raise exception 'Currently this slot is unavailable';
  end if;

  if lower(coalesce(v_slot.game, 'all')) not in ('all', '')
    and lower(v_slot.game) not in (lower(v_game.id::text), lower(v_game.name)) then
    raise exception 'This slot is not available for the selected game';
  end if;

  if lower(coalesce(v_slot.day, 'all')) not in ('all', '')
     and lower(v_slot.day) <> lower(new.day) then
    raise exception 'This slot is not available on %', new.day;
  end if;

  if public.is_employee_banned(v_emp_id, v_game_id, current_date) then
    raise exception 'Try after ban is removed!!!';
  end if;

  new.employee_id := v_emp_id;
  new.game := v_game_id;
  if new.booked_at is null then
    new.booked_at := now();
  end if;

  v_capacity := public.booking_capacity(new.slot_id, v_game_id);

  if tg_op = 'INSERT' then
    select count(*) into v_existing
    from public.bookings b
    where b.day = new.day
      and b.slot_id = new.slot_id
      and b.game = v_game_id;

    if exists (
      select 1
      from public.bookings b
      where b.day = new.day
        and b.game = v_game_id
        and b.employee_id = v_emp_id
    ) then
      raise exception 'You already have a booking for this game on this day!';
    end if;
  else
    select count(*) into v_existing
    from public.bookings b
    where b.day = new.day
      and b.slot_id = new.slot_id
      and b.game = v_game_id
      and b.id <> old.id;

    if exists (
      select 1
      from public.bookings b
      where b.day = new.day
        and b.game = v_game_id
        and b.employee_id = v_emp_id
        and b.id <> old.id
    ) then
      raise exception 'You already have a booking for this game on this day!';
    end if;
  end if;

  if v_existing >= v_capacity then
    raise exception 'This slot is full';
  end if;

  return new;
end;
$$;

create or replace function public.match_result_contains_user(p_players jsonb, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as player
    where upper(coalesce(player ->> 'user_id', '')) = upper(coalesce(p_user_id::text, ''))
  );
$$;

create or replace function public.validate_match_result_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_name text := tg_table_name;
  v_emp_id text := upper(coalesce(nullif(new.submitted_by_employee_id, ''), public.app_current_emp_id()));
  v_expected_team_size integer;
  v_total_players integer;
begin
  if v_table_name = 'carrom_match_results' then
    v_expected_team_size := 2;
  elsif v_table_name = 'chess_match_results' then
    v_expected_team_size := 1;
  else
    raise exception 'Unsupported match result table';
  end if;

  if new.day is null or btrim(new.day) = '' then
    raise exception 'Match day is required';
  end if;

  if new.slot_id is null then
    raise exception 'Slot is required';
  end if;

  if new.submitted_by_user_id is null then
    raise exception 'Submitting user is required';
  end if;

  if v_emp_id = '' then
    raise exception 'Employee ID is required';
  end if;

  if new.submitted_by_name is null or btrim(new.submitted_by_name) = '' then
    raise exception 'Submitting player name is required';
  end if;

  if new.result not in ('team_a', 'team_b', 'draw') then
    raise exception 'Invalid match result';
  end if;

  if jsonb_typeof(new.team_a_players) <> 'array' or jsonb_typeof(new.team_b_players) <> 'array' then
    raise exception 'Team members must be stored as arrays';
  end if;

  if jsonb_array_length(new.team_a_players) <> v_expected_team_size then
    raise exception 'Team A must have % player(s)', v_expected_team_size;
  end if;

  if jsonb_array_length(new.team_b_players) <> v_expected_team_size then
    raise exception 'Team B must have % player(s)', v_expected_team_size;
  end if;

  v_total_players := (
    select count(*)
    from (
      select distinct upper(coalesce(player ->> 'employee_id', '')) as employee_id
      from jsonb_array_elements(coalesce(new.team_a_players, '[]'::jsonb) || coalesce(new.team_b_players, '[]'::jsonb)) as player
    ) as unique_players
  );

  if v_total_players <> v_expected_team_size * 2 then
    raise exception 'Each team member must be unique';
  end if;

  if not (
    public.match_result_contains_user(new.team_a_players, new.submitted_by_user_id)
    or public.match_result_contains_user(new.team_b_players, new.submitted_by_user_id)
  ) then
    raise exception 'Only players in this slot can submit the result';
  end if;

  new.submitted_by_employee_id := v_emp_id;
  if new.created_at is null then
    new.created_at := now();
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.employees (
  id bigint generated by default as identity primary key,
  name text not null,
  email text,
  department text,
  employee_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id text primary key,
  name text not null unique,
  icon text not null default '',
  location text not null default '',
  max_players integer not null default 4,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slots (
  id bigint generated by default as identity primary key,
  label text not null,
  start_time time,
  end_time time,
  duration text not null default '30 min',
  game text not null default 'all',
  day text not null default 'all',
  max_players integer not null default 4,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bans (
  id bigint generated by default as identity primary key,
  employee text not null,
  employee_id text not null references public.employees(employee_code) on update cascade on delete restrict,
  game text not null,
  from_date date not null default current_date,
  until_date date not null,
  reason text not null,
  created_by text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rules (
  id bigint generated by default as identity primary key,
  rule_description text not null,
  created_at date not null default current_date,
  created_by text not null default 'Admin',
  game text not null default 'General',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id bigint generated by default as identity primary key,
  day text not null,
  slot_id bigint not null references public.slots(id) on update cascade on delete restrict,
  player_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id text not null references public.employees(employee_code) on update cascade on delete restrict,
  game text not null,
  booked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carrom_match_results (
  id bigint generated by default as identity primary key,
  day text not null,
  slot_id bigint not null references public.slots(id) on update cascade on delete restrict,
  submitted_by_user_id uuid not null references auth.users(id) on delete cascade,
  submitted_by_employee_id text not null references public.employees(employee_code) on update cascade on delete restrict,
  submitted_by_name text not null,
  team_a_players jsonb not null default '[]'::jsonb,
  team_b_players jsonb not null default '[]'::jsonb,
  result text not null check (result in ('team_a', 'team_b', 'draw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(day, slot_id),
  check (jsonb_typeof(team_a_players) = 'array'),
  check (jsonb_typeof(team_b_players) = 'array'),
  check (jsonb_array_length(team_a_players) = 2),
  check (jsonb_array_length(team_b_players) = 2)
);

create table if not exists public.chess_match_results (
  id bigint generated by default as identity primary key,
  day text not null,
  slot_id bigint not null references public.slots(id) on update cascade on delete restrict,
  submitted_by_user_id uuid not null references auth.users(id) on delete cascade,
  submitted_by_employee_id text not null references public.employees(employee_code) on update cascade on delete restrict,
  submitted_by_name text not null,
  team_a_players jsonb not null default '[]'::jsonb,
  team_b_players jsonb not null default '[]'::jsonb,
  result text not null check (result in ('team_a', 'team_b', 'draw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(day, slot_id),
  check (jsonb_typeof(team_a_players) = 'array'),
  check (jsonb_typeof(team_b_players) = 'array'),
  check (jsonb_array_length(team_a_players) = 1),
  check (jsonb_array_length(team_b_players) = 1)
);

create table if not exists public.violations (
  id bigint generated by default as identity primary key,
  employee text not null,
  employee_id text,
  game text not null default 'General',
  rule text,
  reason text not null,
  status text not null default 'open',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill new columns on older tables if needed
alter table if exists public.games
  add column if not exists max_players integer;
alter table if exists public.games
  add column if not exists sort_order integer not null default 0;
alter table if exists public.games
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.slots
  add column if not exists max_players integer;
alter table if exists public.slots
  add column if not exists active boolean not null default true;
alter table if exists public.slots
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.bookings
  add column if not exists employee_id text;
alter table if exists public.bookings
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.bans
  add column if not exists created_by text;
alter table if exists public.bans
  add column if not exists active boolean not null default true;
alter table if exists public.bans
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.rules
  add column if not exists active boolean not null default true;
alter table if exists public.rules
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.employees
  add column if not exists is_active boolean not null default true;
alter table if exists public.employees
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'employees'
      and c.conname = 'employees_employee_code_key'
  ) then
    alter table public.employees
      add constraint employees_employee_code_key unique (employee_code);
  end if;
end;
$$;

alter table if exists public.violations
  add column if not exists employee_id text;
alter table if exists public.violations
  add column if not exists created_by text;
alter table if exists public.violations
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at
before update on public.employees
for each row execute function public.touch_updated_at();

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at
before update on public.games
for each row execute function public.touch_updated_at();

drop trigger if exists set_slots_updated_at on public.slots;
create trigger set_slots_updated_at
before update on public.slots
for each row execute function public.touch_updated_at();

drop trigger if exists set_bans_updated_at on public.bans;
create trigger set_bans_updated_at
before update on public.bans
for each row execute function public.touch_updated_at();

drop trigger if exists set_rules_updated_at on public.rules;
create trigger set_rules_updated_at
before update on public.rules
for each row execute function public.touch_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.touch_updated_at();

drop trigger if exists set_violations_updated_at on public.violations;
create trigger set_violations_updated_at
before update on public.violations
for each row execute function public.touch_updated_at();

drop trigger if exists validate_booking_trigger on public.bookings;
create trigger validate_booking_trigger
before insert or update on public.bookings
for each row execute function public.validate_booking_row();

drop trigger if exists set_carrom_match_results_updated_at on public.carrom_match_results;
create trigger set_carrom_match_results_updated_at
before update on public.carrom_match_results
for each row execute function public.touch_updated_at();

drop trigger if exists validate_carrom_match_results_trigger on public.carrom_match_results;
create trigger validate_carrom_match_results_trigger
before insert or update on public.carrom_match_results
for each row execute function public.validate_match_result_row();

drop trigger if exists set_chess_match_results_updated_at on public.chess_match_results;
create trigger set_chess_match_results_updated_at
before update on public.chess_match_results
for each row execute function public.touch_updated_at();

drop trigger if exists validate_chess_match_results_trigger on public.chess_match_results;
create trigger validate_chess_match_results_trigger
before insert or update on public.chess_match_results
for each row execute function public.validate_match_result_row();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

create or replace view public.active_bans as
select
  b.*,
  case
    when coalesce(b.active, true) and b.until_date >= current_date then 'Active'
    else 'Expired'
  end as computed_status
from public.bans b
where coalesce(b.active, true) and b.until_date >= current_date;

create or replace view public.ban_history as
select
  b.*,
  case
    when coalesce(b.active, true) and b.until_date >= current_date then 'Active'
    else 'Expired'
  end as computed_status
from public.bans b
order by b.created_at desc;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

insert into public.games (id, name, icon, location, max_players, active, sort_order)
values
  ('carrom', 'Carrom', 'CARROM', 'Recreation Room - 2nd Floor', 4, true, 1),
  ('chess', 'Chess', 'CHESS', 'Conference Room - 1st Floor', 2, true, 2)
on conflict (id) do nothing;

insert into public.slots (id, label, start_time, end_time, duration, game, day, max_players, active)
values
  (1, 'Slot 1', '11:00', '11:30', '30 min', 'all', 'all', 4, true),
  (2, 'Slot 2', '11:30', '12:00', '30 min', 'all', 'all', 4, true),
  (3, 'Slot 3', '12:00', '12:30', '30 min', 'all', 'all', 4, true),
  (4, 'Slot 4', '12:30', '13:00', '30 min', 'all', 'all', 4, true),
  (5, 'Slot 5', '13:00', '13:30', '30 min', 'all', 'all', 4, true),
  (6, 'Slot 6', '13:30', '14:00', '30 min', 'all', 'all', 4, true),
  (7, 'Slot 7', '14:00', '14:30', '30 min', 'all', 'all', 4, true),
  (8, 'Slot 8', '14:30', '15:00', '30 min', 'all', 'all', 4, true),
  (9, 'Slot 9', '15:00', '15:30', '30 min', 'all', 'all', 4, true),
  (10, 'Slot 10', '15:30', '16:00', '30 min', 'all', 'all', 4, true),
  (11, 'Slot 11', '16:00', '16:30', '30 min', 'all', 'all', 4, true),
  (12, 'Slot 12', '16:30', '17:00', '30 min', 'all', 'all', 4, true)
on conflict (id) do nothing;

insert into public.rules (rule_description, created_at, created_by, game, active)
select v.rule_description, current_date, 'Admin', v.game, true
from (
  values
    ('Bookings are permitted for a maximum of one game per day.', 'General'),
    ('If a member fails to utilize their reserved time slot, the booking will be considered forfeited.', 'General'),
    ('Bookings can be entered or cancelled up to 15 minutes before the scheduled time. The member only enters their own name.', 'General'),
    ('Only one active booking per player per game per day. If a player fails to show up within 10 minutes of the booked time, the slot may be given to someone else. Players must maintain silence and avoid disturbing others. No use of mobile phones or loud conversations during the game.', 'General'),
    ('Each time slot has a fixed duration. Members must vacate at the end of their session to allow smooth transition for the next user.', 'General'),
    ('Members are expected to maintain cleanliness and follow game etiquette. Improper behavior or damage may result in suspension of booking privileges. Report any missing or damaged items to the manager.', 'General'),
    ('Please ask for carrom coins from Mr. Abhishek and hand them back at the end of your slot.', 'Carrom'),
    ('Do not move the carrom board from its location.', 'Carrom'),
    ('For any suggestions regarding usage or time slots, please contact Mr. Abhishek (+91-9289132909).', 'General'),
    ('If you are getting blocked every month for 3 consecutive months, you will be automatically blocked for the upcoming 3 months. If the blocked person has any questions, kindly direct them to Mr. Abhishek Mishra for any clarification.', 'General')
) as v(rule_description, game)
where not exists (
  select 1
  from public.rules r
  where r.rule_description = v.rule_description
    and r.game = v.game
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

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

alter table public.carrom_match_results enable row level security;
alter table public.chess_match_results enable row level security;

drop policy if exists carrom_match_results_select_authenticated on public.carrom_match_results;
create policy carrom_match_results_select_authenticated
on public.carrom_match_results
for select
using (auth.role() = 'authenticated');

drop policy if exists carrom_match_results_participant_write on public.carrom_match_results;
create policy carrom_match_results_participant_write
on public.carrom_match_results
for all
using (
  auth.uid() is not null and (
    submitted_by_user_id = auth.uid()
    or public.match_result_contains_user(team_a_players, auth.uid())
    or public.match_result_contains_user(team_b_players, auth.uid())
  )
)
with check (
  auth.uid() is not null and (
    submitted_by_user_id = auth.uid()
    or public.match_result_contains_user(team_a_players, auth.uid())
    or public.match_result_contains_user(team_b_players, auth.uid())
  )
);

drop policy if exists chess_match_results_select_authenticated on public.chess_match_results;
create policy chess_match_results_select_authenticated
on public.chess_match_results
for select
using (auth.role() = 'authenticated');

drop policy if exists chess_match_results_participant_write on public.chess_match_results;
create policy chess_match_results_participant_write
on public.chess_match_results
for all
using (
  auth.uid() is not null and (
    submitted_by_user_id = auth.uid()
    or public.match_result_contains_user(team_a_players, auth.uid())
    or public.match_result_contains_user(team_b_players, auth.uid())
  )
)
with check (
  auth.uid() is not null and (
    submitted_by_user_id = auth.uid()
    or public.match_result_contains_user(team_a_players, auth.uid())
    or public.match_result_contains_user(team_b_players, auth.uid())
  )
);

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
