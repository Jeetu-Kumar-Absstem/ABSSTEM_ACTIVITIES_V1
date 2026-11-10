-- Event hierarchy for reusable teams.
-- Existing teams remain valid with a null event_id; new event-scoped teams
-- can be created without changing tournament history or snapshots.

alter table if exists public.teams
  add column if not exists event_id bigint references public.events(id) on update cascade on delete set null;

create index if not exists teams_event_id_idx on public.teams (event_id);

-- A player may be on a different team in a different event. The UI still
-- prevents duplicate membership within the currently selected event.
drop index if exists public.team_members_one_team_per_player_idx;

