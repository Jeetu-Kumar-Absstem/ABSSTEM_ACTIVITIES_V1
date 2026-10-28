-- Shared clocks for tournament matches.
-- Apply this migration before using the shared Stopwatch tab.

create table if not exists public.tournament_match_clocks (
  match_id bigint primary key references public.tournament_matches(id) on update cascade on delete cascade,
  tournament_id bigint not null references public.tournaments(id) on update cascade on delete cascade,
  mode text not null default 'countdown' check (mode in ('countdown', 'chess')),
  status text not null default 'paused' check (status in ('paused', 'running', 'stopped')),
  duration_seconds integer not null default 1800 check (duration_seconds > 0),
  remaining_seconds integer not null default 1800 check (remaining_seconds >= 0),
  chess_remaining_a_seconds integer not null default 1800 check (chess_remaining_a_seconds >= 0),
  chess_remaining_b_seconds integer not null default 1800 check (chess_remaining_b_seconds >= 0),
  chess_active_side text not null default 'A' check (chess_active_side in ('A', 'B')),
  started_at timestamptz,
  stopped_at timestamptz,
  updated_by text references public.employees(employee_code) on update cascade on delete set null,
  updated_at timestamptz not null default now()
);

create unique index if not exists tournament_match_clocks_tournament_match_idx
  on public.tournament_match_clocks (tournament_id, match_id);

alter table public.tournament_match_clocks enable row level security;

drop policy if exists tournament_match_clocks_select_authenticated on public.tournament_match_clocks;
create policy tournament_match_clocks_select_authenticated
  on public.tournament_match_clocks for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists tournament_match_clocks_insert_authenticated on public.tournament_match_clocks;
create policy tournament_match_clocks_insert_authenticated
  on public.tournament_match_clocks for insert
  with check ((select auth.role()) = 'authenticated');

drop policy if exists tournament_match_clocks_update_authenticated on public.tournament_match_clocks;
create policy tournament_match_clocks_update_authenticated
  on public.tournament_match_clocks for update
  using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

-- Enable Supabase Realtime for cross-browser clock synchronization.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tournament_match_clocks'
  ) then
    alter publication supabase_realtime add table public.tournament_match_clocks;
  end if;
exception when undefined_object then
  -- Local/non-Supabase environments may not have the realtime publication.
  null;
end $$;

drop trigger if exists set_tournament_match_clocks_updated_at on public.tournament_match_clocks;
create trigger set_tournament_match_clocks_updated_at
before update on public.tournament_match_clocks
for each row execute function public.touch_updated_at();
