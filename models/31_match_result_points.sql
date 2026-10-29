-- Points awarded per match result.
-- Existing match records default to zero; future result entries can store
-- separate Team A and Team B awards.

alter table public.tournament_matches
  add column if not exists points_a integer not null default 0,
  add column if not exists points_b integer not null default 0;

alter table public.tournament_matches
  drop constraint if exists tournament_matches_points_nonnegative;

alter table public.tournament_matches
  add constraint tournament_matches_points_nonnegative
  check (points_a >= 0 and points_b >= 0);
