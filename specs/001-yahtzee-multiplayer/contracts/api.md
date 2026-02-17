# API Contracts: Multiplayer Yahtzee

**Branch**: `001-yahtzee-multiplayer`
**Date**: 2026-02-16

## Architecture

Next.js API Routes (App Router) + Supabase Realtime Channels.

- **REST API**: Room creation, joining, game state queries
- **Realtime**: Game actions via Supabase Broadcast/Presence (no custom WebSocket server)

## REST API Endpoints

### POST /api/rooms

Create a new game room.

**Request**:
```json
{
  "hostName": "Alex",
  "maxPlayers": 4
}
```

**Response** (201):
```json
{
  "roomCode": "A3F9K2",
  "roomId": "uuid-here",
  "sessionId": "anon-session-id",
  "shareUrl": "https://app.example.com/ru/game/A3F9K2"
}
```

**Errors**:
- 400: Invalid hostName (empty, >20 chars)
- 500: Room creation failed

---

### POST /api/rooms/:code/join

Join an existing room.

**Request**:
```json
{
  "playerName": "Bob"
}
```

**Response** (200):
```json
{
  "roomId": "uuid-here",
  "playerId": "uuid-here",
  "sessionId": "anon-session-id",
  "playerIndex": 1,
  "players": [
    { "displayName": "Alex", "playerIndex": 0, "isBot": false },
    { "displayName": "Bob", "playerIndex": 1, "isBot": false }
  ]
}
```

**Errors**:
- 404: Room not found
- 409: Room is full (4 players)
- 409: Game already started
- 400: Invalid playerName

---

### POST /api/rooms/:code/start

Start the game (host only).

**Request**: None (session-based auth)

**Response** (200):
```json
{
  "status": "playing",
  "turnOrder": [0, 1, 2, 3],
  "firstPlayer": 0
}
```

**Errors**:
- 403: Not the host
- 409: Not enough players (< 2)
- 409: Game already started

---

### POST /api/rooms/:code/bot

Add a bot to the room (host only).

**Request**:
```json
{
  "botName": "Bot 1"
}
```

**Response** (200):
```json
{
  "playerId": "uuid-here",
  "playerIndex": 2,
  "displayName": "Bot 1",
  "isBot": true
}
```

**Errors**:
- 403: Not the host
- 409: Room is full
- 409: Game already started

---

### GET /api/rooms/:code

Get current room state.

**Response** (200):
```json
{
  "roomCode": "A3F9K2",
  "status": "playing",
  "players": [...],
  "currentRound": 5,
  "currentTurnPlayerIndex": 2,
  "scorecards": { ... }
}
```

**Errors**:
- 404: Room not found

---

### POST /api/rooms/:code/roll

Roll dice (current player only). Server generates random values.

**Request**:
```json
{
  "held": [false, true, false, true, false]
}
```

**Response** (200):
```json
{
  "dice": [3, 5, 1, 5, 6],
  "rollCount": 2,
  "availableCategories": {
    "fives": 10,
    "threeOfAKind": 0,
    "chance": 20,
    "smallStraight": 0,
    ...
  }
}
```

**Errors**:
- 403: Not your turn
- 409: Already rolled 3 times
- 409: Game not in progress

---

### POST /api/rooms/:code/score

Select a scoring category (current player only).

**Request**:
```json
{
  "category": "fives"
}
```

**Response** (200):
```json
{
  "score": 10,
  "nextPlayerIndex": 1,
  "round": 6,
  "gameFinished": false
}
```

**Errors**:
- 403: Not your turn
- 409: Category already filled
- 409: Must roll at least once first
- 400: Invalid category name

---

## Realtime Channel Events

Channel name: `game:room:{roomCode}`

### Broadcast Events (client -> all clients via server)

| Event | Sender | Payload | Description |
|-------|--------|---------|-------------|
| `dice_roll` | Server (via API) | `{ playerIndex, dice, held, rollCount }` | Dice roll result |
| `score_update` | Server (via API) | `{ playerIndex, category, score, round }` | Category scored |
| `turn_change` | Server | `{ playerIndex, round, timeoutAt }` | Turn passed to next player |
| `game_start` | Server | `{ turnOrder, firstPlayer }` | Game has started |
| `game_end` | Server | `{ scores, winner }` | Game finished |
| `turn_timeout` | Server | `{ playerIndex, autoCategory, autoScore }` | Disconnected player auto-skipped |
| `player_joined` | Server | `{ player }` | New player in lobby |
| `player_left` | Server | `{ playerIndex }` | Player left |
| `bot_turn` | Server | `{ playerIndex, dice, held, rollCount, category, score }` | Bot completed their turn |

### Presence State

```typescript
{
  [sessionId: string]: {
    displayName: string;
    playerIndex: number;
    isReady: boolean;        // Lobby: player ready to start
    lastSeen: number;        // Timestamp
  }
}
```

### Presence Events

| Event | Description |
|-------|-------------|
| `sync` | Full presence state sync |
| `join` | Player connected/reconnected |
| `leave` | Player disconnected |

## Authentication

No user accounts. Anonymous Supabase sessions:

```typescript
const { data: { session } } = await supabase.auth.signInAnonymously();
// sessionId = session.user.id
```

Session ID is stored in browser localStorage and used to identify the player across reconnections.

## Error Response Format

All errors follow:
```json
{
  "error": {
    "code": "ROOM_FULL",
    "message": "Room already has 4 players"
  }
}
```

Error codes: `ROOM_NOT_FOUND`, `ROOM_FULL`, `GAME_STARTED`, `NOT_YOUR_TURN`, `INVALID_CATEGORY`, `CATEGORY_FILLED`, `NOT_HOST`, `INVALID_NAME`, `MUST_ROLL_FIRST`, `MAX_ROLLS_REACHED`
