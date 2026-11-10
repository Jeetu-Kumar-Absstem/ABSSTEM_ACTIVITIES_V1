-- Keep player awards inside the event hierarchy.
alter table if exists public.player_point_awards
  add column if not exists event_id bigint references public.events(id) on update cascade on delete set null;

create index if not exists player_point_awards_event_id_idx
  on public.player_point_awards (event_id);
