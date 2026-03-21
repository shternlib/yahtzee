-- Add game_state JSONB column to persist dice/scorecard state in DB instead of server memory
-- Date: 2026-03-21
-- Fixes: BUG-C3 (in-memory state lost on restart), SEC-H1 (race conditions)

ALTER TABLE game_rooms ADD COLUMN game_state JSONB;

-- Fix round constraint to allow round 14 (used as sentinel for game-end detection)
ALTER TABLE game_rooms DROP CONSTRAINT IF EXISTS game_rooms_current_round_check;
ALTER TABLE game_rooms ADD CONSTRAINT game_rooms_current_round_check CHECK (current_round BETWEEN 1 AND 14);
