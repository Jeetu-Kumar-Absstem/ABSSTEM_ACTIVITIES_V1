-- ============================================================
-- Migration 23: Leaderboard aggregate row
-- Consolidate per-game leaderboard rows into a single 'all' row
-- per employee, so the leaderboard view shows one entry per player.
--
-- After this migration the leaderboard table will have:
--   - per-game rows (e.g. employee + 'carrom') preserved for breakdowns
--   - one 'all' row per employee that sums every per-game row
-- The leaderboard_with_rank view filters to game = 'all' so it shows
-- only the consolidated entry.
-- ============================================================

-- 1. Rebuild 'all' rows from the per-game rows currently in the table.
-- This is idempotent: it deletes the 'all' rows first, then re-inserts
-- them as the SUM of the per-game rows.
delete from public.leaderboard where game = 'all';

insert into public.leaderboard (
  employee_id, game, total_points,
  tournament_wins, tournament_seconds, tournament_thirds,
  match_wins, match_losses, draws,
  participations, rule_violations, no_shows,
  last_activity_at
)
select
  employee_id,
  'all' as game,
  coalesce(sum(total_points), 0),
  coalesce(sum(tournament_wins), 0),
  coalesce(sum(tournament_seconds), 0),
  coalesce(sum(tournament_thirds), 0),
  coalesce(sum(match_wins), 0),
  coalesce(sum(match_losses), 0),
  coalesce(sum(draws), 0),
  coalesce(sum(participations), 0),
  coalesce(sum(rule_violations), 0),
  coalesce(sum(no_shows), 0),
  max(last_activity_at)
from public.leaderboard
where game <> 'all'
group by employee_id
on conflict (employee_id, game) do update
set
  total_points       = excluded.total_points,
  tournament_wins    = excluded.tournament_wins,
  tournament_seconds = excluded.tournament_seconds,
  tournament_thirds  = excluded.tournament_thirds,
  match_wins         = excluded.match_wins,
  match_losses       = excluded.match_losses,
  draws              = excluded.draws,
  participations     = excluded.participations,
  rule_violations    = excluded.rule_violations,
  no_shows           = excluded.no_shows,
  last_activity_at   = excluded.last_activity_at,
  updated_at         = now();

-- 2. Refresh the view so the new 'all' rows are picked up immediately.
-- (Views are computed on the fly, so no REFRESH needed — but this is a
-- good place to note that leaderboard_with_rank is now filtered to
-- game = 'all'. See models/16_views.sql.)
