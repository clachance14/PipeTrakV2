-- Function to reset drawings stuck in 'processing' state for over 3 minutes.
-- Can be called manually or scheduled via pg_cron.

CREATE OR REPLACE FUNCTION unstick_processing_drawings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE drawings
  SET processing_status = 'error',
      processing_note = 'Processing timed out (auto-recovered)'
  WHERE processing_status IN ('processing', 'queued')
    AND created_at < now() - interval '3 minutes';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

COMMENT ON FUNCTION unstick_processing_drawings()
IS 'Resets drawings stuck in processing/queued state for over 3 minutes. Safe to call repeatedly.';
