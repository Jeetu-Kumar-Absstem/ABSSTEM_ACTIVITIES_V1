-- Change only new-record defaults. Existing tournament settings and existing
-- clock rows are intentionally preserved.

alter table public.tournaments
  add column if not exists match_duration_minutes integer not null default 10;

alter table public.tournaments
  alter column match_duration_minutes set default 10;

alter table public.tournament_match_clocks
  alter column duration_seconds set default 600,
  alter column remaining_seconds set default 600,
  alter column chess_remaining_a_seconds set default 600,
  alter column chess_remaining_b_seconds set default 600;

alter table public.tournaments
  drop constraint if exists tournaments_match_duration_minutes_check;

alter table public.tournaments
  add constraint tournaments_match_duration_minutes_check
  check (match_duration_minutes between 5 and 240);
