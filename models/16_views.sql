-- Convenience views for the Events / Tournaments / Leaderboard modules.
-- All views respect the same access pattern as their base tables; the RLS
-- policies in 17_rls.sql still apply.

-- Upcoming events: future-dated and not cancelled.
create or replace view public.upcoming_events as
select *
from public.events
where is_published = true
  and coalesce(event_status, 'scheduled') <> 'cancelled'
  and start_date >= current_date
order by start_date asc, start_time asc nulls last;

-- Past events: anything that has already ended.
create or replace view public.past_events as
select *
from public.events
where end_date is not null and end_date < current_date
   or coalesce(event_status, 'scheduled') = 'completed'
order by start_date desc;

-- Active & upcoming tournaments (used by the Tournaments tab).
create or replace view public.active_tournaments as
select *
from public.tournaments
where status in ('registration_open', 'live', 'draft')
order by start_date desc;

-- Completed tournaments (used by Final Results tab).
create or replace view public.completed_tournaments as
select *
from public.tournaments
where status = 'completed'
order by end_date desc nulls last, start_date desc;

-- Leaderboard enriched with rank, employee name & department.
create or replace view public.leaderboard_with_rank as
select
  row_number() over (order by lb.total_points desc, lb.tournament_wins desc, lb.match_wins desc) as rank,
  lb.id,
  lb.employee_id,
  e.name as employee_name,
  e.department,
  lb.game,
  lb.total_points,
  lb.tournament_wins,
  lb.tournament_seconds,
  lb.tournament_thirds,
  lb.match_wins,
  lb.match_losses,
  lb.draws,
  lb.participations,
  lb.rule_violations,
  lb.no_shows,
  lb.last_activity_at,
  lb.updated_at
from public.leaderboard lb
left join public.employees e on e.employee_code = lb.employee_id
order by lb.total_points desc, lb.tournament_wins desc, lb.match_wins desc;

-- Champions hall of fame (every tournament's 1st / 2nd / 3rd row, joined back
-- to the employee master for display).
create or replace view public.champions_hall_of_fame as
select
  fr.tournament_id,
  t.name as tournament_name,
  t.game,
  t.end_date as tournament_end_date,
  fr.position,
  fr.employee_id,
  e.name as champion_name,
  e.department,
  fr.prize_description
from public.final_results fr
left join public.tournaments t on t.id = fr.tournament_id
left join public.employees e on e.employee_code = fr.employee_id
where fr.position between 1 and 3
order by t.end_date desc nulls last, fr.position asc;
