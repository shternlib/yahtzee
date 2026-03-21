---
report_type: verification-audit
generated: 2026-03-21
version: 2026-03-21-v3
status: completed
agent: security-scanner
files_processed: 42
verification_passed: 10
verification_failed: 2
new_vulnerabilities: 4
total_issues: 6
critical_count: 0
high_count: 1
medium_count: 2
low_count: 3
modifications_made: false
---

# Security Verification Audit Report

**Generated**: 2026-03-21
**Project**: Dragon Dice (Multiplayer Yahtzee)
**Scope**: Verify 12 previously-fixed issues + scan for new vulnerabilities
**Files Analyzed**: 42 source files, 4 SQL migrations, 1 config file

---

## Verification Results: Previously Fixed Issues

### PASSED (10 of 12)

| # | Fix | Status | Evidence |
|---|-----|--------|----------|
| 1 | sessionId required on mutations | PASS | All POST endpoints (roll, score, bot, start, skip) check `if (!sessionId)` and return 401 |
| 2 | RLS on all tables | PASS | `002_enable_rls.sql` enables RLS on game_rooms, players, game_scores; INSERT/UPDATE/DELETE blocked |
| 3 | Session IDs removed from GET /rooms/[code] | PASS | Response maps explicit fields only; no session_id or host_session_id in output |
| 4 | Server requires SUPABASE_SERVICE_ROLE_KEY | PASS | `server.ts:5-7` throws on missing key, no anon fallback |
| 5 | crypto.randomInt() for dice and codes | PASS | `dice.ts:1` and `room-code.ts:1` import from crypto; randomInt used throughout |
| 6 | Display name sanitization | PASS | sanitize.ts strips HTML, control chars, RTL overrides; used in rooms, join, bot endpoints |
| 7 | Rate limiting in middleware | PASS | middleware.ts applies tiered rate limiting for all /api/rooms routes |
| 8 | Security headers in next.config.ts | PASS | X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy configured |
| 9 | Anonymous auth enabled | PASS | config.toml line 171: `enable_anonymous_sign_ins = true` |
| 10 | Expired rooms cleanup | PASS | `004_expired_rooms_cleanup.sql` creates function + hourly pg_cron schedule |
| 12 | Game state persisted in DB | PASS | gameState.ts loads/saves to game_rooms.game_state JSONB column (migration 003) |

---

## VERIFICATION FAILURES (2 of 12)

### FAIL-1 [LOW]: Broadcast spoofing mitigation is incomplete

**Original fix #11**: "Broadcast spoofing mitigated via state reconciliation"

**File**: `src/hooks/useGameChannel.ts:67-129`

**What works**: The client validates `dice_roll` and `score_update` events by checking if `payload.playerIndex` matches the local `currentTurn.playerIndex` (lines 70-76, 90-93). If mismatched, it triggers a server sync. The `game_start` event checks that status is `lobby` (line 109).

**What does NOT work**: The `game_end` (line 118) and `player_joined` (line 124) events perform NO validation whatsoever. A malicious client who knows the room code can:

1. Send a spoofed `game_end` broadcast with fake scores and winner, causing all clients to show incorrect results
2. Send spoofed `player_joined` events to inject phantom players into the lobby UI
3. Send spoofed `player_left` events to remove players from the UI

The periodic sync (every 30s during gameplay) would eventually correct the state, but the disruption window is significant. The server state remains authoritative, so this is a display-only attack.

**Severity**: Medium -- display disruption via broadcast spoofing

---

### FAIL-2 [LOW]: Host detection on client broken as side effect of fix #3

**Original fix #3**: "Session IDs removed from GET /rooms/[code] response"

**File**: `src/app/api/rooms/[code]/route.ts:28-42` and `src/app/[locale]/game/[code]/page.tsx:55`

**What happened**: The GET endpoint correctly omits `host_session_id` from the response (fix #3 is properly implemented). However, the client at `page.tsx:55` still references `data.hostSessionId`, which is now always `undefined`. This means:

- `state.hostSessionId` is always `null`
- `isHost` check in `LobbyView.tsx:13` and `GameBoard.tsx:35` always returns `false`
- The host never sees "Add Bot" or "Start Game" buttons in the lobby
- The auto-skip for disconnected players (GameBoard.tsx:38-65) never triggers

This is a functional regression, not a security vulnerability. Server-side host verification in `bot/route.ts:31` and `start/route.ts:33` still works correctly, so host-only actions remain protected.

**Severity**: Low (functional bug from security fix, not a security issue itself)

---

## NEW VULNERABILITIES

### NEW-1 [HIGH]: Join endpoint accepts unverified sessionId for player creation

**File**: `src/app/api/rooms/[code]/join/route.ts:79-84`

**Description**: The join endpoint accepts a `sessionId` in the request body and uses it directly as the player's session without verifying it against Supabase Auth:

```typescript
// Line 79-84
let finalSessionId = sessionId
if (!finalSessionId) {
  const { data: authData } = await supabase.auth.signInAnonymously()
  finalSessionId = authData.session?.user.id
}
```

When a client provides a `sessionId`, it is used as-is to create the player record. This means:

1. An attacker can provide a **fabricated sessionId** (any string) and become a valid player
2. If they guess or obtain another player's sessionId, they can create a second player record sharing that session
3. The UNIQUE constraint `(room_id, session_id)` prevents duplicates within the same room, but does not prevent using arbitrary strings
4. Once a player record exists with a given sessionId, that sessionId can be used to perform game actions (roll, score) on behalf of that player

**Impact**: Session fabrication. While sessionIds are UUIDs and hard to guess, the lack of verification means the system treats any string as a valid session identifier. This violates the assumption that sessionIds are cryptographically generated by Supabase Auth.

**Fix**: Always generate a new anonymous session for genuinely new players. Only use the provided sessionId for the rejoin lookup (lines 48-63), not as the actual player session:

```typescript
// After rejoin check, always create new session for new players:
const { data: authData } = await supabase.auth.signInAnonymously()
const finalSessionId = authData.session?.user.id
```

---

### NEW-2 [MEDIUM]: Skip endpoint allows any player to skip any other player's turn

**File**: `src/app/api/rooms/[code]/skip/route.ts:36-49`

**Description**: The skip endpoint verifies that the requester is a player in the game (line 49) but does NOT verify that the requester is the host. The comment on line 36 confirms this is intentional: "Verify requester is a player in this game (but NOT the current turn player)."

However, this allows any player to trigger a skip for the current turn player, forcing a 0-score in their first unfilled category. The client-side restriction (only the host triggers skips) provides no real protection since the API can be called directly.

**Impact**: Game integrity -- a malicious player can repeatedly skip opponents' turns to force 0-scores and guarantee a win. This is easily exploitable with a simple HTTP client.

**Fix**: Add host verification:
```typescript
if (room.host_session_id !== sessionId) {
  return errorResponse('NOT_HOST', 'Only the host can skip turns', 403)
}
```

---

### NEW-3 [LOW]: Rate limiter bypassable via X-Forwarded-For spoofing

**File**: `src/middleware.ts:46-52`

**Description**: The `getClientIp()` function trusts `X-Forwarded-For` directly:

```typescript
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1'
}
```

Without a trusted reverse proxy stripping this header, any client can set arbitrary IP addresses to bypass rate limiting entirely. Each request with a different spoofed IP gets its own rate limit window.

**Impact**: Complete rate limit bypass if not behind a trusted proxy. When deployed on Vercel or similar platforms that properly manage these headers, the risk is mitigated by infrastructure.

**Fix**: Use platform-specific headers (Vercel's `x-real-ip` is set by edge and cannot be spoofed). Consider checking `x-forwarded-for` only as fallback and documenting the trusted proxy requirement.

---

### NEW-4 [LOW]: game_state JSONB readable by any anonymous user via direct Supabase query

**File**: `supabase/migrations/002_enable_rls.sql:12-13`, `supabase/migrations/003_add_game_state.sql`

**Description**: The RLS SELECT policy on `game_rooms` is `USING (true)`, allowing any authenticated user (including anonymous) to read all columns. Since the `game_state` column contains scorecards, dice values, and held state for all players, a user can query Supabase directly with the public anon key to read the full game state of any room.

While the `/api/rooms/[code]/state` endpoint correctly requires sessionId verification, a client can bypass the API and query `supabase.from('game_rooms').select('game_state').eq('code', 'ROOMCD')` directly.

**Impact**: Low -- information disclosure of game state. In Yahtzee, scorecards are typically visible to all players, and dice values are broadcast anyway. The practical impact is minimal, but it violates the principle of least privilege.

---

## Cheating Analysis (Post-Verification)

| Vector | Status | Notes |
|--------|--------|-------|
| Roll/score without auth | Blocked | 401 on missing sessionId |
| Score for other player | Blocked | 403 NOT_YOUR_TURN |
| Direct DB manipulation | Blocked | RLS enabled, mutations blocked for anon |
| Predict dice | Blocked | crypto.randomInt |
| Impersonate via leaked session | Blocked | Sessions not in GET response |
| Skip opponent's turn | **OPEN** | Any player can call /skip (NEW-2) |
| Join with fabricated session | **OPEN** | Unverified sessionId accepted (NEW-1) |
| Broadcast UI spoofing | **Partial** | game_end/player_joined unvalidated (FAIL-1) |
| Rate limit bypass | **Conditional** | Depends on deployment platform (NEW-3) |
| Read opponent state directly | **Open** | Direct Supabase query (NEW-4) |

---

## Task List

### High Priority (Fix Before Deployment)
- [ ] **[NEW-1]** Verify or regenerate sessionId in join endpoint (`src/app/api/rooms/[code]/join/route.ts:80-84`)

### Medium Priority (Fix This Sprint)
- [ ] **[NEW-2]** Add host authorization check to skip endpoint (`src/app/api/rooms/[code]/skip/route.ts`)
- [ ] **[FAIL-1]** Add validation to game_end, player_joined, player_left broadcast handlers (`src/hooks/useGameChannel.ts`)

### Low Priority (Backlog)
- [ ] **[FAIL-2]** Fix client-side host detection -- either return hostSessionId in GET response or use alternative approach (e.g., player_index === 0 as host marker)
- [ ] **[NEW-3]** Use platform-specific IP headers for rate limiting (`src/middleware.ts:46-52`)
- [ ] **[NEW-4]** Restrict game_state column visibility via RLS or Supabase view

---

*Report generated by security-scanner verification audit*
*No modifications were made to the codebase*
