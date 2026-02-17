# Data Model: Multiplayer Yahtzee

**Branch**: `001-yahtzee-multiplayer`
**Date**: 2026-02-16

## Entities

### GameRoom

Persistent entity stored in Supabase Postgres.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique room identifier |
| code | TEXT | UNIQUE, 6 chars | Shareable room code (e.g., "A3F9K2") |
| host_session_id | TEXT | NOT NULL | Anonymous session ID of room creator |
| status | TEXT | NOT NULL, CHECK | Room state: `lobby`, `playing`, `finished` |
| max_players | INT | DEFAULT 4, CHECK 2-4 | Maximum players allowed |
| current_turn_player_index | INT | DEFAULT 0 | Index of player whose turn it is |
| current_round | INT | DEFAULT 1, CHECK 1-13 | Current round number |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Room creation timestamp |
| started_at | TIMESTAMPTZ | NULLABLE | When game started |
| finished_at | TIMESTAMPTZ | NULLABLE | When game ended |
| expires_at | TIMESTAMPTZ | DEFAULT NOW() + 24h | Auto-cleanup time |

**State Transitions**: `lobby` -> `playing` -> `finished`

### Player

Persistent entity, linked to GameRoom.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique player identifier |
| room_id | UUID | FK -> game_rooms(id) ON DELETE CASCADE | Room reference |
| session_id | TEXT | NOT NULL | Anonymous session identifier |
| display_name | TEXT | NOT NULL, max 20 chars | Player's chosen name |
| player_index | INT | NOT NULL, CHECK 0-3 | Turn order position |
| is_bot | BOOLEAN | DEFAULT FALSE | Whether player is AI bot |
| is_connected | BOOLEAN | DEFAULT TRUE | Connection status |
| joined_at | TIMESTAMPTZ | DEFAULT NOW() | When player joined |

**Constraints**: UNIQUE(room_id, session_id), UNIQUE(room_id, player_index)

### Scorecard (In-Memory / Broadcast State)

Managed via Supabase Broadcast, persisted to DB only at game end.

| Field | Type | Description |
|-------|------|-------------|
| player_id | UUID | Reference to player |
| ones | INT or NULL | Score for Ones category |
| twos | INT or NULL | Score for Twos category |
| threes | INT or NULL | Score for Threes category |
| fours | INT or NULL | Score for Fours category |
| fives | INT or NULL | Score for Fives category |
| sixes | INT or NULL | Score for Sixes category |
| three_of_a_kind | INT or NULL | Score for Three of a Kind |
| four_of_a_kind | INT or NULL | Score for Four of a Kind |
| full_house | INT or NULL | Score for Full House |
| small_straight | INT or NULL | Score for Small Straight |
| large_straight | INT or NULL | Score for Large Straight |
| yahtzee | INT or NULL | Score for Yahtzee |
| chance | INT or NULL | Score for Chance |

**Computed Fields** (client-side):
- `upper_total`: Sum of ones..sixes
- `upper_bonus`: 35 if upper_total >= 63, else 0
- `lower_total`: Sum of three_of_a_kind..chance
- `grand_total`: upper_total + upper_bonus + lower_total

### GameScore (Persistent Final Scores)

Stored in Supabase Postgres at game end.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Score record ID |
| room_id | UUID | FK -> game_rooms(id) ON DELETE CASCADE | Game reference |
| player_id | UUID | FK -> players(id) ON DELETE CASCADE | Player reference |
| upper_total | INT | NOT NULL | Upper section total |
| upper_bonus | INT | NOT NULL | Bonus (0 or 35) |
| lower_total | INT | NOT NULL | Lower section total |
| grand_total | INT | NOT NULL | Final score |
| is_winner | BOOLEAN | DEFAULT FALSE | Whether this player won |
| scorecard_data | JSONB | NOT NULL | Full scorecard snapshot |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | When score was saved |

## Real-time State (Broadcast)

These are ephemeral states managed via Supabase Broadcast, not persisted in DB.

### TurnState (broadcast event: `turn_state`)

```typescript
interface TurnState {
  playerIndex: number;       // Whose turn it is
  dice: number[];            // Current dice values [1-6, 1-6, 1-6, 1-6, 1-6]
  held: boolean[];           // Which dice are held [false, false, false, false, false]
  rollCount: number;         // How many times rolled this turn (0-3)
  phase: 'waiting' | 'rolling' | 'selecting'; // Turn phase
  timeoutAt: number | null;  // Timestamp when turn will auto-skip (disconnected player)
}
```

### GameState (broadcast event: `game_state`)

```typescript
interface GameState {
  roomCode: string;
  status: 'lobby' | 'playing' | 'finished';
  players: PlayerInfo[];
  currentTurn: TurnState;
  scorecards: Record<string, ScorecardData>; // playerIndex -> scores
  round: number;
  version: number;          // Increments on each state change for sync
}

interface PlayerInfo {
  id: string;
  displayName: string;
  playerIndex: number;
  isBot: boolean;
  isConnected: boolean;
}

interface ScorecardData {
  ones: number | null;
  twos: number | null;
  threes: number | null;
  fours: number | null;
  fives: number | null;
  sixes: number | null;
  threeOfAKind: number | null;
  fourOfAKind: number | null;
  fullHouse: number | null;
  smallStraight: number | null;
  largeStraight: number | null;
  yahtzee: number | null;
  chance: number | null;
}
```

## Entity Relationships

```
GameRoom (1) ──< (N) Player
GameRoom (1) ──< (N) GameScore
Player   (1) ──< (1) GameScore
Player   (1) ──  (1) Scorecard [in-memory]
GameRoom (1) ──  (1) TurnState [in-memory]
```

## Indexes

```sql
CREATE INDEX idx_game_rooms_code ON game_rooms(code);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);
CREATE INDEX idx_game_rooms_expires ON game_rooms(expires_at);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_session ON players(session_id);
CREATE INDEX idx_game_scores_room_id ON game_scores(room_id);
```

## Supabase Realtime Publication

```sql
-- Only add tables that need Postgres Changes subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
-- game_scores NOT added - no need for realtime on final scores
```
