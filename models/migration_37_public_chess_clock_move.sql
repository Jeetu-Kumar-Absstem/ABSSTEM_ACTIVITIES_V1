-- Allow the holder of a shared chess-clock link to press Move Complete.
-- Starting, pausing, stopping and resetting remain authenticated controls.

create or replace function public.public_chess_clock_move(p_share_token text)
returns public.tournament_match_clocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clock public.tournament_match_clocks;
  v_elapsed integer := 0;
  v_a integer;
  v_b integer;
  v_next_side text;
begin
  select * into v_clock
  from public.tournament_match_clocks
  where share_token = p_share_token
  for update;

  if not found or v_clock.status <> 'running' then
    return v_clock;
  end if;

  v_elapsed := greatest(0, floor(extract(epoch from (now() - v_clock.started_at)))::integer);
  v_a := greatest(0, v_clock.chess_remaining_a_seconds - case when v_clock.chess_active_side = 'A' then v_elapsed else 0 end);
  v_b := greatest(0, v_clock.chess_remaining_b_seconds - case when v_clock.chess_active_side = 'B' then v_elapsed else 0 end);
  v_next_side := case when v_clock.chess_active_side = 'A' then 'B' else 'A' end;

  update public.tournament_match_clocks
  set mode = 'chess',
      chess_remaining_a_seconds = v_a,
      chess_remaining_b_seconds = v_b,
      chess_active_side = v_next_side,
      started_at = now(),
      status = case when (v_next_side = 'A' and v_a = 0) or (v_next_side = 'B' and v_b = 0) then 'stopped' else 'running' end,
      stopped_at = case when (v_next_side = 'A' and v_a = 0) or (v_next_side = 'B' and v_b = 0) then now() else null end
  where match_id = v_clock.match_id
  returning * into v_clock;
  return v_clock;
end;
$$;

grant execute on function public.public_chess_clock_move(text) to anon, authenticated;
