-- Clean up expired rooms automatically
-- Runs every hour via pg_cron

CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM game_rooms WHERE expires_at < NOW();
END;
$$;

-- Schedule hourly cleanup (Supabase has pg_cron enabled by default)
SELECT cron.schedule(
  'cleanup-expired-rooms',
  '0 * * * *',  -- every hour at minute 0
  'SELECT cleanup_expired_rooms()'
);
