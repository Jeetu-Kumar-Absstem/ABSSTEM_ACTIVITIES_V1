-- Explicitly distinguish the legacy one-game team event from a formatted
-- tournament. Existing rows keep the legacy behaviour.
alter table public.tournaments
  add column if not exists competition_mode text not null default 'single_match';

alter table public.tournaments
  drop constraint if exists tournaments_competition_mode_check;
alter table public.tournaments
  add constraint tournaments_competition_mode_check
  check (competition_mode in ('single_match', 'format'));

create index if not exists tournaments_competition_mode_idx
  on public.tournaments (competition_mode);
