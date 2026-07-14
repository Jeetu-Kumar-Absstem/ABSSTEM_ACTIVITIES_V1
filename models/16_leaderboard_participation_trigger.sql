-- ─────────────────────────────────────────────────────────────────────────────
-- 16_leaderboard_participation_trigger.sql
-- Auto-award / revoke participation points when players register or withdraw.
-- ─────────────────────────────────────────────────────────────────────────────

-- Participation points are an OVERALL metric (not per-game), so the trigger
-- always writes to the (employee_id, 'all') row in the leaderboard.

CREATE OR REPLACE FUNCTION public.leaderboard_on_participant_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT or status changed TO active → award participation
  IF (TG_OP = 'INSERT' AND NEW.status != 'withdrawn') THEN
    PERFORM public.leaderboard_apply(
      NEW.employee_id,
      'all',
      '{"participations": 1}'::jsonb
    );

  -- UPDATE: player just withdrew → reverse participation point
  ELSIF (TG_OP = 'UPDATE'
         AND OLD.status != 'withdrawn'
         AND NEW.status = 'withdrawn') THEN
    PERFORM public.leaderboard_apply(
      NEW.employee_id,
      'all',
      '{"participations": -1}'::jsonb
    );

  -- UPDATE: player re-registered (withdrawn → active) → re-award
  ELSIF (TG_OP = 'UPDATE'
         AND OLD.status = 'withdrawn'
         AND NEW.status != 'withdrawn') THEN
    PERFORM public.leaderboard_apply(
      NEW.employee_id,
      'all',
      '{"participations": 1}'::jsonb
    );

  -- DELETE of an active participant → reverse
  ELSIF (TG_OP = 'DELETE' AND OLD.status != 'withdrawn') THEN
    PERFORM public.leaderboard_apply(
      OLD.employee_id,
      'all',
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
-- BACKFILL: award participation points for all existing active registrations.
-- Writes to the (employee_id, 'all') row only.
-- Run once; safe to re-run (leaderboard_apply uses ON CONFLICT DO UPDATE).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT tp.employee_id
      FROM public.tournament_participants tp
     WHERE tp.status != 'withdrawn'
  LOOP
    PERFORM public.leaderboard_apply(
      rec.employee_id,
      'all',
      '{"participations": 1}'::jsonb
    );
  END LOOP;
END;
$$;