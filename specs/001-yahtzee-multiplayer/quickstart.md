# Quickstart: Multiplayer Yahtzee

**Branch**: `001-yahtzee-multiplayer`
**Date**: 2026-02-16

## Prerequisites

- Node.js 22.x (via nvm)
- Supabase account (free tier)
- Vercel account (free tier, for deployment)

## Setup

### 1. Initialize Next.js project

```bash
npx create-next-app@latest yahtzee-multiplayer \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*"
cd yahtzee-multiplayer
```

### 2. Install dependencies

```bash
npm install @supabase/supabase-js @3d-dice/dice-box-threejs next-intl
npm install -D vitest @testing-library/react @playwright/test
```

### 3. Supabase project setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the project URL and anon key
3. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Database migration

Run in Supabase SQL Editor or via CLI:

```sql
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

-- game_scores table (final scores only)
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

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
```

### 5. Enable anonymous auth

In Supabase Dashboard > Authentication > Providers > Anonymous Sign-Ins > Enable.

### 6. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or use Chrome DevTools mobile emulation.

## Development Order

Recommended implementation sequence:

1. **Yahtzee scoring logic** (`src/lib/yahtzee/scoring.ts`) — pure functions, easy to test
2. **Database schema + Supabase client** (`src/lib/supabase/`) — foundation for all API routes
3. **Room creation/joining API** (`src/app/api/rooms/`) — core REST endpoints
4. **Home page + Lobby UI** — create/join game flow
5. **Realtime channel setup** (`src/lib/supabase/realtime.ts`) — Broadcast + Presence
6. **Game state management** (`src/context/`) — reducer + context provider
7. **Game board UI** — turn indicator, player list, scorecard
8. **3D dice integration** (`src/components/dice/`) — dice-box-threejs wrapper
9. **Roll + Score API routes** — complete gameplay loop
10. **Bot AI** (`src/lib/yahtzee/bot.ts`) — greedy heuristic strategy
11. **i18n setup** (`next-intl` config + translation files)
12. **Disconnect/reconnect handling** — presence events + turn timeout
13. **Results screen + final score persistence**
14. **Polish** — animations, mobile UX, error handling

## Key Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run unit tests (vitest)
npx playwright test  # Run e2e tests
```

## Architecture Notes

- **No custom WebSocket server** — Supabase Broadcast handles all realtime communication
- **Scorecards are in-memory** — broadcast via Supabase, persisted to DB only at game end
- **Server-side dice generation** — API routes generate random values to prevent manipulation
- **Anonymous sessions** — `supabase.auth.signInAnonymously()` for channel access, no user accounts
- **URL-based i18n** — `/en/game/A3F9K2` and `/ru/game/A3F9K2` via next-intl middleware
