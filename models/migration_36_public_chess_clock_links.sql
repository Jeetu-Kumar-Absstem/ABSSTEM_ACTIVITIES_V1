-- Public, read-only chess clock links.
alter table public.tournament_match_clocks add column if not exists share_token text unique;
alter table public.tournament_match_clocks add column if not exists public_match_title text;
alter table public.tournament_match_clocks add column if not exists public_side_a text;
alter table public.tournament_match_clocks add column if not exists public_side_b text;
create index if not exists tournament_match_clocks_share_token_idx on public.tournament_match_clocks (share_token);

drop policy if exists tournament_match_clocks_select_public_share on public.tournament_match_clocks;
create policy tournament_match_clocks_select_public_share
  on public.tournament_match_clocks for select to anon
  using (share_token is not null);
