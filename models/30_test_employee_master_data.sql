-- Permanent test-player master data only.
-- Existing employees are never deleted or renamed.
-- Keep player_names in the same order; append new players at the end.

do $$
declare
  player_names text[] := array[
    'Test Player', 'Test Player', 'Test Player', 'Test Player',
    'Test Player', 'Test Player', 'Test Player', 'Test Player',
    'Test Player', 'Test Player', 'Test Player', 'Test Player',
    'Test Player', 'Test Player', 'Test Player', 'Test Player',
    'Test Player', 'Test Player', 'Test Player', 'Test Player',
    'Test Player', 'Test Player', 'Test Player', 'Test Player'
  ];
begin
  insert into public.employees (employee_code, name, department)
  select 'TEST_EMP_ID_' || n, trim(player_names[n]), 'Testing Dept'
  from generate_subscripts(player_names, 1) as indexes(n)
  where nullif(trim(player_names[n]), '') is not null
  on conflict (employee_code) do nothing;
end $$;
