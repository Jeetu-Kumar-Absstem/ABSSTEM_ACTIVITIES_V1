-- Register only the employee IDs listed below in one open tournament.
-- Run 30_test_employee_master_data.sql first if these are test employees.
-- Existing registrations are not deleted or changed.

do $$
declare
  -- Set the tournament ID you want to fill.
  target_tournament_id bigint := 1;

  -- Replace this list with the employees you want to register.
  employee_ids text[] := array[
    'TEST_EMP_ID_1',
    'TEST_EMP_ID_2',
    'TEST_EMP_ID_3'
  ];

  tournament_row record;
  existing_count integer;
  requested_count integer;
  available_slots integer;
begin
  if target_tournament_id is null then
    raise exception 'Set target_tournament_id before running this script';
  end if;

  select t.id, t.max_participants
  into tournament_row
  from public.tournaments t
  where t.id = target_tournament_id
    and t.status = 'registration_open'
    and t.registration_open = true;

  if not found then
    raise exception 'Tournament % is not open for registration', target_tournament_id;
  end if;

  -- Make sure every listed employee exists and is active.
  if exists (
    select 1
    from unnest(employee_ids) as requested(employee_code)
    where not exists (
      select 1
      from public.employees e
      where upper(e.employee_code) = upper(trim(requested.employee_code))
        and e.is_active = true
    )
  ) then
    raise exception 'One or more listed employees do not exist or are inactive';
  end if;

  select count(*) into existing_count
  from public.tournament_participants p
  where p.tournament_id = target_tournament_id;

  select count(distinct upper(trim(employee_code)))
  into requested_count
  from unnest(employee_ids) as requested(employee_code)
  where not exists (
    select 1
    from public.tournament_participants p
    where p.tournament_id = target_tournament_id
      and upper(p.employee_id) = upper(trim(requested.employee_code))
  );

  available_slots := tournament_row.max_participants - existing_count;
  if requested_count > available_slots then
    raise exception 'Only % tournament slots remain, but % new employees were requested', available_slots, requested_count;
  end if;

  insert into public.tournament_participants
    (tournament_id, employee_id, status, seed)
  select
    target_tournament_id,
    upper(trim(requested.employee_code)),
    'registered',
    row_number() over (order by requested.ordinality)::integer
  from unnest(employee_ids) with ordinality as requested(employee_code, ordinality)
  where not exists (
    select 1
    from public.tournament_participants p
    where p.tournament_id = target_tournament_id
      and upper(p.employee_id) = upper(trim(requested.employee_code))
  )
  on conflict (tournament_id, employee_id) do nothing;
end $$;
