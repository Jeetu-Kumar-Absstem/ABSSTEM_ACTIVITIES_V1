-- tournament_planner.sql
-- OPTIONAL database changes for the tournament planner work.
-- The app works without any of this. Run only what you want, in the Supabase SQL editor.

-- 1) Playoff mode for round-robin / league tournaments  ('auto' = adaptive playoff, 'none' = league winner only)
--    After running this, set SUPPORTS_PLAYOFF_MODE = true in AppContext.jsx.
alter table tournaments
  add column if not exists playoff_mode text not null default 'auto';

alter table tournaments
  drop constraint if exists tournaments_playoff_mode_check;
alter table tournaments
  add constraint tournaments_playoff_mode_check check (playoff_mode in ('auto', 'none'));

-- 2) (Recommended) Prevent duplicate match codes inside one tournament.
--    Check first that no duplicates exist:
--      select tournament_id, match_code, count(*) from tournament_matches
--      group by 1, 2 having count(*) > 1;
--    If that returns no rows, run:
-- create unique index if not exists tournament_matches_unique_code
--   on tournament_matches (tournament_id, match_code);

-- 3) (Recommended) Remove orphan teams that belong to tournaments with no matches
--    (left behind by failed generations before this update). Review before running:
--      select t.* from tournament_teams t
--      where not exists (select 1 from tournament_matches m where m.tournament_id = t.tournament_id);