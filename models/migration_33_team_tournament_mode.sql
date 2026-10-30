-- Team tournament mode and flexible match lineups.
-- Existing tournaments remain individual tournaments because the new columns
-- default to the legacy behaviour.

alter table public.tournaments
  add column if not exists participant_mode text not null default 'individual';

alter table public.tournaments
  add column if not exists lineup_mode text not null default 'variable';

alter table public.tournaments
  add column if not exists lineup_size integer;

alter table public.tournaments
  drop constraint if exists tournaments_participant_mode_check;
alter table public.tournaments
  add constraint tournaments_participant_mode_check
  check (participant_mode in ('individual', 'team'));

alter table public.tournaments
  drop constraint if exists tournaments_lineup_mode_check;
alter table public.tournaments
  add constraint tournaments_lineup_mode_check
  check (lineup_mode in ('variable', 'fixed', 'full_team'));

alter table public.tournaments
  drop constraint if exists tournaments_lineup_size_check;
alter table public.tournaments
  add constraint tournaments_lineup_size_check
  check (lineup_size is null or lineup_size > 0);

create index if not exists tournaments_participant_mode_idx
  on public.tournaments (participant_mode);

alter table public.tournament_teams
  add column if not exists reusable_team_id bigint;

alter table public.tournament_teams
  drop constraint if exists tournament_teams_reusable_team_id_fkey;
alter table public.tournament_teams
  add constraint tournament_teams_reusable_team_id_fkey
  foreign key (reusable_team_id) references public.teams(id)
  on update cascade on delete set null;

create index if not exists tournament_teams_reusable_team_idx
  on public.tournament_teams (reusable_team_id);

