-- Multiplayer Yahtzee: Initial Schema
-- Date: 2026-02-16

-- game_rooms table
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'finished')),
  max_players INT DEFAULT 4 CHECK (max_players BETWEEN 2 AND 4),
  current_turn_player_index INT DEFAULT 0,
  current_round INT DEFAULT 1 CHECK (current_round BETWEEN 1 AND 13),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  player_index INT NOT NULL CHECK (player_index BETWEEN 0 AND 3),
  is_bot BOOLEAN DEFAULT FALSE,
  is_connected BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, session_id),
  UNIQUE(room_id, player_index)
);

-- game_scores table (final scores persisted at game end)
CREATE TABLE game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  upper_total INT NOT NULL,
  upper_bonus INT NOT NULL,
  lower_total INT NOT NULL,
  grand_total INT NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  scorecard_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_rooms_code ON game_rooms(code);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);
CREATE INDEX idx_game_rooms_expires ON game_rooms(expires_at);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_session ON players(session_id);
CREATE INDEX idx_game_scores_room_id ON game_scores(room_id);

-- Enable Realtime for lobby/game updates
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
