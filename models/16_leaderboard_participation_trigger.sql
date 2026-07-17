-- 16_leaderboard_participation_trigger.sql
-- Participation now gives no leaderboard points.
-- Keep the trigger in place so the schema stays idempotent, but make it a no-op.

CREATE OR REPLACE FUNCTION public.leaderboard_on_participant_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_participant ON public.tournament_participants;
CREATE TRIGGER trg_leaderboard_participant
AFTER INSERT OR UPDATE OR DELETE ON public.tournament_participants
FOR EACH ROW EXECUTE FUNCTION public.leaderboard_on_participant_change();
