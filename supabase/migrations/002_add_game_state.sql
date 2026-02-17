-- Add game_state JSONB column to store dice/scorecard state
-- This replaces the in-memory Map which doesn't work on serverless
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS game_state jsonb DEFAULT NULL;
