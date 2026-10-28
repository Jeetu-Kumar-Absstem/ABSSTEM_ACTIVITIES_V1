-- Register existing TEST_EMP_ID_N employees into tournaments.
-- Run 30_test_employee_master_data.sql first.
-- Existing registrations are never deleted or changed.

do $$
declare
  target_tournament_id bigint := null;
  desired_player_count integer := 24;
  -- With no target ID, only empty registration-open tournaments are filled.
  fill_empty_open_tournaments boolean := true;
  tournament_row record;
  existing_count integer;
  target_count integer;
  needed_count integer;
begin
  if desired_player_count < 1 then
    raise exception 'desired_player_count must be at least 1';
  end if;

  if target_tournament_id is not null then
    select t.id, t.max_participants into tournament_row
    from public.tournaments t
    where t.id = target_tournament_id
      and t.status = 'registration_open'
      and t.registration_open = true;
    if not found then
      raise exception 'Target tournament is not open for registration';
    end if;

    target_count := least(desired_player_count, tournament_row.max_participants);
    select count(*) into existing_count
    from public.tournament_participants p
    where p.tournament_id = tournament_row.id
      and p.employee_id like 'TEST_EMP_ID_%';
    needed_count := greatest(target_count - existing_count, 0);

    if needed_count > 0 then
      insert into public.tournament_participants
        (tournament_id, employee_id, status, seed)
      select tournament_row.id, 'TEST_EMP_ID_' || n, 'registered', n
      from generate_series(1, desired_player_count) as numbers(n)
      where exists (
        select 1 from public.employees e
        where e.employee_code = 'TEST_EMP_ID_' || n
      )
      and not exists (
        select 1 from public.tournament_participants existing
        where existing.tournament_id = tournament_row.id
          and existing.employee_id = 'TEST_EMP_ID_' || n
      )
      order by n limit needed_count
      on conflict (tournament_id, employee_id) do nothing;
    end if;

  elsif fill_empty_open_tournaments then
    for tournament_row in
      select t.id, t.max_participants from public.tournaments t
      where t.status = 'registration_open'
        and t.registration_open = true
        and not exists (
          select 1 from public.tournament_participants p
          where p.tournament_id = t.id
            and p.employee_id like 'TEST_EMP_ID_%'
        )
    loop
      target_count := least(desired_player_count, tournament_row.max_participants);
      insert into public.tournament_participants
        (tournament_id, employee_id, status, seed)
      select tournament_row.id, 'TEST_EMP_ID_' || n, 'registered', n
      from generate_series(1, target_count) as numbers(n)
      where exists (
        select 1 from public.employees e
        where e.employee_code = 'TEST_EMP_ID_' || n
      )
      on conflict (tournament_id, employee_id) do nothing;
    end loop;
  end if;
end $$;
