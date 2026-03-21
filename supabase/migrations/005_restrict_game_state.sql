-- Restrict direct access to sensitive columns
-- Date: 2026-03-21
--
-- game_state JSONB and host_session_id are readable via direct Supabase queries.
-- Postgres RLS is row-level only — cannot exclude individual columns.
-- Revoking SELECT breaks Realtime subscriptions.
--
-- Mitigation strategy (implemented in application layer):
-- 1. API endpoints never expose session IDs to other players (isHost/isMe flags instead)
-- 2. game_state contains scorecards (public in Yahtzee) and dice (broadcast anyway)
-- 3. host_session_id is an anonymous UUID — knowing it doesn't help without being that session
-- 4. All mutations require server-side session verification
--
-- If stricter column-level access is needed in the future:
-- - Use PostgREST column permissions (Supabase supports this)
-- - Or create a database function that returns only allowed columns

-- Create a helper view for admin/analytics (excludes sensitive columns)
CREATE OR REPLACE VIEW public.game_rooms_summary AS
  SELECT
    id, code, status, max_players,
    current_turn_player_index, current_round,
    created_at, started_at, finished_at, expires_at
  FROM game_rooms;

GRANT SELECT ON public.game_rooms_summary TO anon, authenticated;
