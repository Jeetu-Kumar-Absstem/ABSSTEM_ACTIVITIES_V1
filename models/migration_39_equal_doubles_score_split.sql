-- Store equal decimal contributions for doubles / multi-player sides.
-- Example: a side score of 25 with two players becomes 12.50 + 12.50.

-- PostgreSQL cannot alter a column type while a view depends on it.
drop view if exists public.team_cumulative_points;

alter table public.team_match_score_entries
  alter column score type numeric(10,2)
  using score::numeric;

-- Normalize existing player rows so an old 13 + 12 split becomes 12.50 + 12.50.
with grouped as (
  select
    id,
    sum(score) over (partition by match_id, team_id, side) /
      nullif(count(*) over (partition by match_id, team_id, side), 0) as equal_score
  from public.team_match_score_entries
)
update public.team_match_score_entries entries
set score = round(grouped.equal_score, 2)
from grouped
where entries.id = grouped.id;

create or replace view public.team_cumulative_points as
select
  t.id as team_id,
  t.name as team_name,
  coalesce(sum(s.score), 0)::numeric(12,2) as total_points,
  count(distinct s.tournament_id)::integer as tournaments_played
from public.teams t
left join public.team_match_score_entries s on s.team_id = t.id
where t.is_active = true
group by t.id, t.name;
