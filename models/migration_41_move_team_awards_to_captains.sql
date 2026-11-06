-- Existing player awards made against a team member should be credited to the
-- team's captain. The team_id remains unchanged, so team totals are preserved.
update public.player_point_awards awards
set employee_id = captains.employee_id
from (
  select distinct on (tm.team_id)
    tm.team_id,
    tm.employee_id
  from public.team_members tm
  join public.employees e on e.employee_code = tm.employee_id
  where lower(coalesce(tm.role, '')) = 'captain'
     or lower(trim(e.name)) in ('anshita verma', 'arifa', 'nikita', 'ritu', 'nandani', 'ritika')
  order by tm.team_id,
    case when lower(coalesce(tm.role, '')) = 'captain' then 0 else 1 end,
    tm.joined_at asc,
    tm.employee_id
) captains
where awards.team_id = captains.team_id
  and awards.employee_id <> captains.employee_id;
