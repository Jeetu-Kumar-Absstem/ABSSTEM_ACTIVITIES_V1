create extension if not exists pgcrypto;

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
