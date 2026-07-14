-- ─────────────────────────────────────────────────────────────────────────────
-- 16_leaderboard_participation_trigger.sql
-- Auto-award / revoke participation points when players register or withdraw.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: get the game for a tournament
-- (used inside the trigger to know which game key to pass)

CREATE OR REPLACE FUNCTION public.leaderboard_on_participant_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_game text;
BEGIN
  -- Fetch the game for this tournament
  SELECT lower(coalesce(game, 'all'))
    INTO v_game
    FROM public.tournaments
   WHERE id = coalesce(NEW.tournament_id, OLD.tournament_id);

  -- INSERT or status changed TO active → award participation
  IF (TG_OP = 'INSERT' AND NEW.status != 'withdrawn') THEN
    PERFORM public.leaderboard_apply(
      NEW.employee_id,
      v_game,
      '{"participations": 1}'::jsonb
    );

  -- UPDATE: player just withdrew → reverse participation point
  ELSIF (TG_OP = 'UPDATE'
         AND OLD.status != 'withdrawn'
         AND NEW.status = 'withdrawn') THEN
    PERFORM public.leaderboard_apply(
      NEW.employee_id,
      v_game,
      '{"participations": -1}'::jsonb
    );

  -- UPDATE: player re-registered (withdrawn → active) → re-award
  ELSIF (TG_OP = 'UPDATE'
         AND OLD.status = 'withdrawn'
         AND NEW.status != 'withdrawn') THEN
    PERFORM public.leaderboard_apply(
      NEW.employee_id,
      v_game,
      '{"participations": 1}'::jsonb
    );

  -- DELETE of an active participant → reverse
  ELSIF (TG_OP = 'DELETE' AND OLD.status != 'withdrawn') THEN
    PERFORM public.leaderboard_apply(
      OLD.employee_id,
      v_game,
      '{"participations": -1}'::jsonb
    );
  END IF;

  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_participant ON public.tournament_participants;
CREATE TRIGGER trg_leaderboard_participant
AFTER INSERT OR UPDATE OR DELETE ON public.tournament_participants
FOR EACH ROW EXECUTE FUNCTION public.leaderboard_on_participant_change();


-- ─────────────────────────────────────────────────────────────────────────────
-- BACKFILL: award participation points for all existing active registrations
-- that are not yet in the leaderboard.
-- Run once; safe to re-run (leaderboard_apply uses ON CONFLICT DO UPDATE).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT tp.employee_id, lower(coalesce(t.game, 'all')) AS game
      FROM public.tournament_participants tp
      JOIN public.tournaments t ON t.id = tp.tournament_id
     WHERE tp.status != 'withdrawn'
  LOOP
    PERFORM public.leaderboard_apply(
      rec.employee_id,
      rec.game,
      '{"participations": 1}'::jsonb
    );
  END LOOP;
END;
$$;