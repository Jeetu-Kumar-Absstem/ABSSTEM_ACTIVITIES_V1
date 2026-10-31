-- Normalize score rows created by the old doubles behavior.
--
-- Before this migration, a doubles result with a team score of 10 stored 10
-- for both players, making the Dashboard show 20. The entered side score is
-- the maximum stored score for that match/team/side in the old format, so
-- divide it across the stored players. A remainder is assigned to the first
-- rows so the contribution sum remains exactly equal to the entered score.

with grouped as (
  select
    id,
    score,
    row_number() over (partition by match_id, team_id, side order by id) - 1 as player_index,
    count(*) over (partition by match_id, team_id, side) as player_count,
    max(score) over (partition by match_id, team_id, side) as team_score
  from public.team_match_score_entries
), allocated as (
  select
    id,
    floor(team_score::numeric / nullif(player_count, 0))::integer
      + case
          when player_index < (team_score % nullif(player_count, 1)) then 1
          else 0
        end as normalized_score
  from grouped
)
update public.team_match_score_entries entries
set score = allocated.normalized_score
from allocated
where entries.id = allocated.id
  and entries.score <> allocated.normalized_score;
