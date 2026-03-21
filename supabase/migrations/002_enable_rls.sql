-- Enable Row-Level Security on all tables
-- Date: 2026-03-21
-- All mutations go through the server (service_role key), so INSERT/UPDATE/DELETE
-- are restricted to service_role only. SELECT is open since room codes act as access control.

-- Enable RLS
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- game_rooms: anyone can read (need room code to find), only server can mutate
CREATE POLICY "game_rooms_select" ON game_rooms
  FOR SELECT USING (true);

CREATE POLICY "game_rooms_insert" ON game_rooms
  FOR INSERT WITH CHECK (false);

CREATE POLICY "game_rooms_update" ON game_rooms
  FOR UPDATE USING (false);

CREATE POLICY "game_rooms_delete" ON game_rooms
  FOR DELETE USING (false);

-- players: anyone can read (needed for game UI), only server can mutate
CREATE POLICY "players_select" ON players
  FOR SELECT USING (true);

CREATE POLICY "players_insert" ON players
  FOR INSERT WITH CHECK (false);

CREATE POLICY "players_update" ON players
  FOR UPDATE USING (false);

CREATE POLICY "players_delete" ON players
  FOR DELETE USING (false);

-- game_scores: anyone can read, only server can mutate
CREATE POLICY "game_scores_select" ON game_scores
  FOR SELECT USING (true);

CREATE POLICY "game_scores_insert" ON game_scores
  FOR INSERT WITH CHECK (false);

CREATE POLICY "game_scores_update" ON game_scores
  FOR UPDATE USING (false);

CREATE POLICY "game_scores_delete" ON game_scores
  FOR DELETE USING (false);
