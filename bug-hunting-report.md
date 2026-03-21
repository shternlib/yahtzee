---
report_type: bug-hunting
generated: 2026-03-21T14:40:00Z
version: 2026-03-21-v3-verification
status: success
agent: bug-hunter (verification audit)
duration: ~5m
files_processed: 52
issues_found: 17
critical_count: 1
high_count: 5
medium_count: 7
low_count: 4
modifications_made: false
---

# Bug Hunting Report -- Verification Audit

**Generated**: 2026-03-21
**Project**: Yahtzee Multiplayer (Dragon Dice)
**Files Analyzed**: 52 source files, 4 SQL migrations
**Total Issues Found**: 17
**Status**: Previous 40-issue fixes largely verified; new and remaining issues identified below

---

## Executive Summary

The previous audit's fixes are well-implemented. `Math.random()` has been replaced with `crypto.randomInt`, `as any` casts are eliminated, console calls are routed through a structured logger (with proper eslint-disable comments), RLS is in place, rate limiting works, and sessionId is required on all mutation endpoints. The DB-persisted game state solves the in-memory state problem.

However, this verification audit uncovered 1 critical issue (build failure), 5 high-priority issues (race conditions, dead code, missing error handling), 7 medium issues, and 4 low issues.

### Key Metrics
- **Critical Issues**: 1
- **High Priority Issues**: 5
- **Medium Priority Issues**: 7
- **Low Priority Issues**: 4

### Verified Fixes (Confirmed Working)
- `crypto.randomInt` used everywhere (dice.ts, room-code.ts)
- No `as any` casts remain
- No raw `console.log/error/warn` outside logger.ts
- No `Math.random()` usage
- sessionId required on all mutation endpoints (roll, score, skip, start, bot)
- RLS migration (002) covers all tables
- Game state persisted to DB via game_state JSONB column
- Sanitization applied to all display name inputs
- Rate limiting on API routes via middleware
- Request logging via middleware
- Health endpoint with Supabase connectivity check
- Cleanup cron for expired rooms
- State reconciliation via SYNC_STATE action + periodic sync

---

## Critical Issues (Priority 1)

### Issue #1: Production build fails -- server.ts throws at module evaluation time
- **File**: `src/lib/supabase/server.ts:5-7`
- **Category**: Build / Deployment Blocker
- **Description**: `server.ts` has a top-level `throw` statement that executes at module import time. During `next build`, Next.js tries to evaluate all route modules (including API routes) to collect page data. Since `SUPABASE_SERVICE_ROLE_KEY` is not available in the build environment, the build crashes with: `Error: SUPABASE_SERVICE_ROLE_KEY is required for server operations`.
- **Impact**: The application cannot be deployed. `npm run build` fails. This is a regression from the security fix that made the service role key required.
- **Fix**: Guard the check so it only throws at call time, not at import time. For example:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

export function createServerClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server operations')
  }
  return createClient(supabaseUrl, key)
}
```

---

## High Priority Issues (Priority 2)

### Issue #2: Race condition in DB state -- no optimistic locking on game_state
- **File**: `src/lib/yahtzee/gameState.ts:27-36`, used in `roll/route.ts`, `score/route.ts`, `skip/route.ts`, `botExecutor.ts`
- **Category**: Race Condition / Data Integrity
- **Description**: The pattern is read-modify-write: `loadRoomState()` reads, code modifies in memory, then `saveRoomState()` writes back. With concurrent requests (e.g., rapid double-clicks, two browser tabs, or bot execution overlapping with human actions), the second write can overwrite the first without seeing it. There is no version column, no database-level CAS, and no advisory lock.
- **Impact**: In a multiplayer game, a player could lose their score entry or have dice state corrupted when two requests overlap. The bot executor's `sleep()` calls widen the race window further -- a human player could submit a score while the bot is mid-turn.
- **Fix**: Add a `state_version` column (integer, starts at 0) to `game_rooms`. Increment on every write. In `saveRoomState`, include `WHERE state_version = expectedVersion` and check `count === 0` to detect conflicts. Alternatively, use Supabase's `select().for('update')` for row-level locking (Postgres `SELECT ... FOR UPDATE`).

### Issue #3: `clearRoomState` imported but never called
- **File**: `src/app/api/rooms/[code]/score/route.ts:9`
- **Category**: Dead Code
- **Description**: `clearRoomState` is imported from `gameState.ts` but never used in `score/route.ts`. The code sets `game_state: null` inline instead of calling the helper function. This is harmless but indicates leftover code from a refactor.
- **Impact**: Dead import adds confusion and may cause lint warnings in stricter configs.
- **Fix**: Remove `clearRoomState` from the import statement. If no other file uses it, consider removing the function from `gameState.ts` as well (currently only `score/route.ts` imports it, and it does not call it).

### Issue #4: `broadcastEvent` function exported but never used anywhere
- **File**: `src/lib/supabase/realtime.ts:14-24`
- **Category**: Dead Code
- **Description**: The `broadcastEvent` function in `realtime.ts` is exported but not imported or called by any file in the codebase. All server-side broadcasting uses `serverBroadcast` from `serverBroadcast.ts`. This appears to be leftover from the pre-refactor architecture.
- **Impact**: Dead code that adds maintenance burden and potential confusion.
- **Fix**: Remove the `broadcastEvent` function from `realtime.ts`.

### Issue #5: `ensureSession` function exported but never used
- **File**: `src/lib/supabase/client.ts:10-18`
- **Category**: Dead Code
- **Description**: `ensureSession` is exported from `client.ts` but not imported or called anywhere in the codebase. Anonymous sessions are created server-side in `rooms/route.ts` and `join/route.ts` instead.
- **Impact**: Dead code. If the function was intended for client-side session bootstrap (e.g., for Realtime auth), it is currently unused and the client may face auth issues on Realtime channels depending on Supabase project config.
- **Fix**: Either integrate `ensureSession` into the client-side flow (e.g., call it before subscribing to presence/game channels) or remove it if server-side session management is sufficient.

### Issue #6: `saveRoomState` and `serverBroadcast` silently swallow errors
- **File**: `src/lib/yahtzee/gameState.ts:27-36`, `src/lib/supabase/serverBroadcast.ts:4-22`
- **Category**: Missing Error Handling
- **Description**: Both `saveRoomState` and `serverBroadcast` call Supabase but do not check or propagate errors from the responses. If a DB write fails (e.g., constraint violation, network error), the caller has no way to know. The callers (roll/score/skip routes) proceed as if the state was saved successfully and return 200 to the client.
- **Impact**: Silent data loss. A player could get a "success" response while their score was not actually persisted. On next load/sync, the state would appear to revert.
- **Fix**: Check `{ error }` from Supabase calls and either throw or return an error. For `saveRoomState`:
```typescript
export async function saveRoomState(...) {
  const { error } = await supabase.from('game_rooms').update(...)...
  if (error) throw new Error(`Failed to save game state: ${error.message}`)
}
```

---

## Medium Priority Issues (Priority 3)

### Issue #7: GET /api/rooms/[code] does not return `hostSessionId` -- client cannot determine host
- **File**: `src/app/api/rooms/[code]/route.ts:28-42`
- **Category**: Missing Data
- **Description**: The room GET endpoint returns `roomCode`, `roomId`, `status`, `maxPlayers`, `currentRound`, `currentTurnPlayerIndex`, and `players`, but does NOT return `hostSessionId`. However, the game page (`page.tsx:55`) expects `data.hostSessionId` from this endpoint and uses it to set the host in the reducer. Since it is `undefined`, `hostSessionId` in state will be `undefined` (not a string), and the `isHost` check in `LobbyView` and `GameBoard` will always be false for users who reload.
- **Impact**: After a page refresh, the host player cannot start the game, add bots, or trigger skip because `isHost` evaluates to `false`. This is a functional regression.
- **Fix**: Add `hostSessionId: room.host_session_id` to the GET response. Note: this does expose the host's session ID to other players, but since session IDs are anonymous UUIDs and all mutations require server verification, the risk is low. Alternatively, return a boolean `isHost` flag by comparing against a query-parameter sessionId.

### Issue #8: Player `sessionId` never included in GET room response -- rejoin detection broken
- **File**: `src/app/api/rooms/[code]/route.ts:35-41`, `src/app/[locale]/game/[code]/page.tsx:46-48`
- **Category**: Logic Error
- **Description**: The GET endpoint maps players to `{ id, displayName, playerIndex, isBot, isConnected }` but does NOT include `sessionId`. The game page then tries to find the existing player by matching `p.sessionId === sessionId`, which always fails because `sessionId` is not in the response. This means `existingPlayer` is always `undefined`.
- **Impact**: After page refresh, even the host is treated as a new visitor. If the game is in `lobby` status, they see the join form again. If in `playing` or `finished`, they see an error. Rejoin is broken for all players.
- **Fix**: Include `sessionId: p.session_id` in the player mapping in the GET response. Be aware of the security implication: other players' session IDs become visible. An alternative is to accept a `sessionId` query parameter and return only a `isMe: true/false` flag for each player, or return the matching player separately.

### Issue #9: `serverBroadcast` creates a new Supabase client and channel per call
- **File**: `src/lib/supabase/serverBroadcast.ts:4-22`
- **Category**: Performance
- **Description**: Every broadcast call creates a new Supabase client (`createServerClient()`), subscribes to a new channel, waits for SUBSCRIBED, sends one message, and unsubscribes. In `botExecutor.ts`, this happens 3-6+ times per bot turn (rolls + score update). With multiple bots, this creates dozens of short-lived WebSocket connections.
- **Impact**: Increased latency per broadcast (~100-300ms for subscribe/unsubscribe). Under load, may hit Supabase connection limits. Bot turns already add `sleep()` delays, and the broadcast overhead compounds this.
- **Fix**: Cache the Supabase client at module level and reuse channels (subscribe once per room, send multiple times, unsubscribe when done). For `botExecutor.ts`, pass a pre-subscribed channel into the function.

### Issue #10: `serverBroadcast` has no timeout on subscription -- can hang indefinitely
- **File**: `src/lib/supabase/serverBroadcast.ts:14-19`
- **Category**: Reliability
- **Description**: The Promise wrapping `channel.subscribe()` resolves on `SUBSCRIBED` or rejects on `CHANNEL_ERROR`, but Supabase can also emit `TIMED_OUT` or `CLOSED` statuses. If none of the handled statuses fire, the Promise never resolves and the API request hangs.
- **Impact**: An API request could hang indefinitely, tying up a serverless function slot and leaving the client waiting. Eventually the client-side fetch would time out, but the server resource is leaked.
- **Fix**: Add a timeout wrapper (e.g., `Promise.race` with a 5-second `setTimeout`) and handle `TIMED_OUT`/`CLOSED` statuses.

### Issue #11: Rate limiter uses in-memory Map -- does not work across serverless instances
- **File**: `src/lib/utils/rate-limit.ts`, `src/middleware.ts`
- **Category**: Architecture Limitation
- **Description**: The `RateLimiter` stores request counts in a `Map` in the Node.js process memory. In serverless environments (Vercel, AWS Lambda), each invocation may run in a different instance. The rate limit state is not shared across instances.
- **Impact**: Rate limiting is ineffective in production serverless deployments. An attacker can bypass limits by hitting different instances.
- **Fix**: For production, use an external store (e.g., Upstash Redis with `@upstash/ratelimit`). The current implementation is fine for single-server deployments and development.

### Issue #12: Middleware logs `200` for all rate-limited-pass-through requests regardless of actual response status
- **File**: `src/middleware.ts:117`
- **Category**: Incorrect Logging
- **Description**: When a request passes rate limiting (line 117), the middleware creates a `NextResponse.next()` and logs its status as `200`. However, `NextResponse.next()` returns a pass-through response -- the actual HTTP status is determined by the downstream route handler. The logged status `200` may be incorrect (the route might return 400, 404, 500, etc.).
- **Impact**: API request logs show incorrect status codes, making debugging and monitoring unreliable.
- **Fix**: Next.js middleware cannot easily capture the downstream response status. Options: (a) remove status from middleware logging and rely on route-level logging, (b) use a custom server or API middleware wrapper instead.

### Issue #13: `current_round` CHECK constraint allows 14, but `TOTAL_ROUNDS` is 13
- **File**: `supabase/migrations/003_add_game_state.sql:9`, `src/lib/yahtzee/categories.ts:87`
- **Category**: Logic / Schema Mismatch
- **Description**: Migration 003 explicitly expands the constraint to `CHECK (current_round BETWEEN 1 AND 14)` with a comment saying "sentinel for game-end detection." The code checks `nextRound > TOTAL_ROUNDS` (i.e., `> 13`, so 14 triggers game end). This works correctly but is fragile -- the sentinel value is not documented in code, and a future developer might not understand why 14 is allowed.
- **Impact**: Low functional impact since the logic works, but creates confusion.
- **Fix**: Add a code-level constant like `const GAME_END_ROUND_SENTINEL = TOTAL_ROUNDS + 1` and reference it in the game-end check. Add a comment explaining the DB constraint.

---

## Low Priority Issues (Priority 4)

### Issue #14: `RateLimiter.cleanupTimer` interval never cleared on process exit (memory leak in long-running processes)
- **File**: `src/lib/utils/rate-limit.ts:24`
- **Category**: Resource Leak
- **Description**: Each `RateLimiter` instance starts a `setInterval` for cleanup. The module-level `rateLimiters` object creates 4 instances. The `destroy()` method exists but is never called. In serverless environments this is harmless (short-lived), but in `next dev` or a custom server, these timers keep the process alive and prevent graceful shutdown.
- **Impact**: Minor -- mostly affects development experience (process may not exit cleanly).
- **Fix**: Call `unref()` on the timer: `this.cleanupTimer = setInterval(...); this.cleanupTimer.unref()`. This allows the process to exit even with the timer running.

### Issue #15: `LobbyView` hardcodes max players as 4
- **File**: `src/components/lobby/LobbyView.tsx:15,71`
- **Category**: Hardcoded Value
- **Description**: `canAddBot` checks `state.players.length < 4` and the player count display says "of 4". However, the room's `maxPlayers` can be 2 or 3 (the API clamps it to 2-4). The hardcoded 4 means the lobby always shows "of 4" even for a 2-player room.
- **Impact**: Minor UX confusion -- users of 2-player rooms see "1 of 4" instead of "1 of 2".
- **Fix**: Add `maxPlayers` to the game state and use it instead of the hardcoded 4.

### Issue #16: `page.tsx` JoinForm does not store player name on join
- **File**: `src/app/[locale]/game/[code]/page.tsx:91-139`
- **Category**: UX
- **Description**: When joining via the game page's JoinForm, `storePlayerName()` is not called. The home page calls it on room creation, but not the join-via-URL flow. If a user joins via a shared link, their name is not persisted for next time.
- **Impact**: Minor UX inconvenience -- the name field is blank if they visit the home page later.
- **Fix**: Add `storePlayerName(name)` in the `handleJoin` callback after a successful join.

### Issue #17: `app/page.tsx` hardcodes redirect to `/en`
- **File**: `src/app/page.tsx:4`
- **Category**: Internationalization
- **Description**: The root page always redirects to `/en` regardless of the user's browser locale or any locale detection. `next-intl` can detect the preferred locale from `Accept-Language` headers if configured, but the hardcoded redirect bypasses this.
- **Impact**: Russian-speaking users always land on the English version first.
- **Fix**: Use `next-intl`'s locale detection or `routing.ts` config to determine the appropriate redirect target.

---

## Code Cleanup Required

### Dead Code to Remove
| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/lib/supabase/realtime.ts` | 14-24 | Unused Export | `broadcastEvent` function never imported |
| `src/lib/supabase/client.ts` | 10-18 | Unused Export | `ensureSession` function never called |
| `src/app/api/rooms/[code]/score/route.ts` | 9 | Unused Import | `clearRoomState` imported but not used |

### Debug Code
No remaining debug code found. All console calls are properly routed through the logger utility with eslint-disable comments.

---

## Validation Results

### Type Check
**Command**: `npx tsc --noEmit`
**Status**: PASSED
**Exit Code**: 0

### Build
**Command**: `npm run build`
**Status**: FAILED (Critical Issue #1)
**Error**: `SUPABASE_SERVICE_ROLE_KEY is required for server operations` at module evaluation time
**Exit Code**: 1

### Tests
**Command**: `npm run test`
**Status**: PASSED (43 tests, 2 test files)
**Exit Code**: 0

### Overall Status
**Validation**: FAILED -- Build does not succeed without env vars at build time

---

## Metrics Summary
- **Security Vulnerabilities**: 0 new (previous fixes verified)
- **Performance Issues**: 2 (serverBroadcast overhead, rate limiter scope)
- **Type Errors**: 0
- **Dead Code Items**: 3 (broadcastEvent, ensureSession, clearRoomState import)
- **Debug Statements**: 0 (all properly routed through logger)
- **Technical Debt Score**: Medium

---

## Task List

### Critical Tasks (Fix Immediately)
- [ ] **[CRITICAL-1]** Move service role key check from module-level to function-level in `src/lib/supabase/server.ts` to unblock production builds

### High Priority Tasks (Fix Before Deployment)
- [ ] **[HIGH-1]** Add `hostSessionId` to GET `/api/rooms/[code]` response so host can be identified after refresh
- [ ] **[HIGH-2]** Include `sessionId` (or `isMe` flag) in player data from GET `/api/rooms/[code]` so rejoin works
- [ ] **[HIGH-3]** Add error checking to `saveRoomState` and `serverBroadcast` -- propagate DB/channel errors
- [ ] **[HIGH-4]** Remove dead imports/exports: `clearRoomState` (score route), `broadcastEvent` (realtime.ts), `ensureSession` (client.ts)
- [ ] **[HIGH-5]** Add optimistic locking (state_version column) to prevent race conditions on game_state writes

### Medium Priority Tasks (Schedule for Sprint)
- [ ] **[MEDIUM-1]** Add timeout to `serverBroadcast` channel subscription
- [ ] **[MEDIUM-2]** Cache/reuse Supabase client and channels in `serverBroadcast` for performance
- [ ] **[MEDIUM-3]** Fix middleware logging to not assume 200 status for pass-through responses
- [ ] **[MEDIUM-4]** Document the round-14 sentinel pattern or replace with explicit constant
- [ ] **[MEDIUM-5]** Replace in-memory rate limiter with external store for production (Upstash Redis)

### Low Priority Tasks (Backlog)
- [ ] **[LOW-1]** Call `.unref()` on rate limiter cleanup timers
- [ ] **[LOW-2]** Use `maxPlayers` from room state instead of hardcoded 4 in LobbyView
- [ ] **[LOW-3]** Call `storePlayerName()` in join-via-URL flow
- [ ] **[LOW-4]** Use locale detection instead of hardcoded `/en` redirect in root page

---

## Recommendations

1. **Immediate Actions**:
   - Fix the build failure (Critical-1) -- this is a 2-line change that unblocks deployment
   - Fix the hostSessionId/sessionId response issues (HIGH-1, HIGH-2) -- these break core UX after page refresh

2. **Short-term Improvements**:
   - Add error propagation from Supabase calls (HIGH-3) to prevent silent data loss
   - Clean up dead code (HIGH-4) for maintainability
   - Add race condition protection (HIGH-5) to prevent score corruption in multiplayer

3. **Long-term Refactoring**:
   - Move to a more robust broadcasting architecture (reusable channels, connection pooling)
   - Consider external rate limiting for serverless production deployment
   - Add integration tests for the full game flow (create, join, play, score, end)

---

## Next Steps

### Immediate Actions (Required)
1. Fix Critical-1 (server.ts build failure)
2. Fix HIGH-1 and HIGH-2 (host/rejoin detection)
3. Remove dead code (HIGH-4)

### Recommended Actions (Optional)
- Add error handling to DB operations
- Implement optimistic locking for game state
- Add integration test coverage

---

*Report generated by bug-hunter agent (verification audit)*
*No modifications made to source files*
