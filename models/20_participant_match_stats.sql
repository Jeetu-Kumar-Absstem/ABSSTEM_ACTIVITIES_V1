-- 20_participant_match_stats.sql
-- Adds a helper function to update tournament_participants win/loss/played
-- counters when a match result is recorded.
--
-- Run this in Supabase SQL Editor, OR include it in your models folder
-- when migrating to a self-hosted / cloud Postgres instance.
--
-- What this fixes:
--   Matches Played / Won / Lost showing 0 in the Registered Participants
--   table under Bracket / Fixtures, even after match results are entered.
--   The root cause: recordMatchResult only saved scores to tournament_matches
--   but never updated the counters on tournament_participants rows.
--

-- ── 1. Helper function ──────────────────────────────────────────────────────
-- Called from the JS layer (AppContext.recordMatchResult) after a match
-- result is saved. Atomically increments the counters in one round-trip.
--
-- p_increment_played:
--   Pass TRUE on first result entry (match was 'pending' / 'live').
--   Pass FALSE when editing an already-completed match result so we
--   don't double-count matches_played.

CREATE OR REPLACE FUNCTION public.participant_record_match(
  p_tournament_id uuid,
  p_winner_id     text,
  p_loser_id      text,
  p_increment_played boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with owner rights, bypasses RLS safely
SET search_path = public
AS $$
BEGIN
  -- Increment matches_played for both players (only on first entry)
  IF p_increment_played THEN
    UPDATE tournament_participants
    SET matches_played = matches_played + 1
    WHERE tournament_id = p_tournament_id
      AND employee_id IN (p_winner_id, p_loser_id)
      AND status IN ('registered', 'active', 'semi_finalist', 'finalist', 'eliminated');
  END IF;

  -- Increment wins for the winner
  IF p_winner_id IS NOT NULL AND p_winner_id != '' THEN
    UPDATE tournament_participants
    SET wins = wins + 1
    WHERE tournament_id = p_tournament_id
      AND employee_id = p_winner_id
      AND status IN ('registered', 'active', 'semi_finalist', 'finalist', 'eliminated');
  END IF;

  -- Increment losses for the loser
  IF p_loser_id IS NOT NULL AND p_loser_id != '' THEN
    UPDATE tournament_participants
    SET losses = losses + 1
    WHERE tournament_id = p_tournament_id
      AND employee_id = p_loser_id
      AND status IN ('registered', 'active', 'semi_finalist', 'finalist', 'eliminated');
  END IF;
END;
$$;

-- ── 2. Grant execute to authenticated users ─────────────────────────────────
-- Same pattern as 19_grants.sql → leaderboard_apply grant.
-- SECURITY DEFINER means the function runs as owner (elevated),
-- this grant only allows logged-in users to invoke it.
GRANT EXECUTE ON FUNCTION public.participant_record_match(uuid, text, text, boolean)
  TO authenticated;
