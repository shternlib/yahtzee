---
report_type: vulnerability-hunting
generated: 2026-03-21
updated: 2026-03-21
version: 2026-03-21-v2
status: resolved
agent: security-scanner
files_processed: 28
issues_found: 18
issues_fixed: 14
issues_remaining: 4
critical_count: 0
high_count: 1
medium_count: 3
low_count: 0
modifications_made: true
---

# Security Scan Report (Updated)

**Generated**: 2026-03-21 | **Updated**: 2026-03-21
**Project**: Dragon Dice (Multiplayer Yahtzee)
**Commit**: `4dce230`

---

## Summary

Out of 18 vulnerabilities found, **14 fixed**, **4 remaining** (no critical).

---

## Fixed Issues

| ID | Priority | Issue | Fix |
|---|---|---|---|
| CRITICAL-1 | Critical | All authorization bypassable | sessionId required on all endpoints |
| CRITICAL-2 | Critical | No RLS on any table | Migration 002: RLS + policies on all 3 tables |
| CRITICAL-3 | Critical | Session IDs leaked in GET response | Removed sessionId and hostSessionId from response |
| CRITICAL-4 | Critical | Client sessionId trusted without verification | Verified against players table in DB |
| CRITICAL-5 | Critical | Server falls back to anon key | Fail-fast if SUPABASE_SERVICE_ROLE_KEY missing |
| HIGH-1 | High | In-memory state (data loss, race conditions) | Migrated to DB game_state JSONB |
| HIGH-2 | High | Math.random() for dice and codes | crypto.randomInt() |
| HIGH-4 | High | No input sanitization on names | sanitizeDisplayName utility |
| HIGH-5 | High | Anonymous auth disabled in config | Set enable_anonymous_sign_ins = true |
| HIGH-6 | High | Expired rooms never cleaned up | pg_cron hourly cleanup migration |
| MEDIUM-1 | Medium | No security headers | Added X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| MEDIUM-4 | Medium | Race condition room code generation | Mitigated by UNIQUE constraint + retry |
| MEDIUM-5 | Medium | `undefined as any` type safety | deleteRoomState with Map.delete |
| LOW-2 | Low | .env.example missing service role key | Added with documentation |

---

## Remaining Issues

### HIGH-3: No rate limiting on API endpoints

- **Status**: Open
- **Impact**: Spam room creation, brute-force room codes, DoS potential.
- **Fix plan**: Requires Redis/Upstash infrastructure. See next steps plan below.
- **Mitigation**: Supabase Auth has built-in rate limits (30 anonymous sign-ins/hour). Room codes have ~729M combinations, making brute-force impractical at normal throughput.

### MEDIUM-2: COPPA compliance concerns

- **Status**: Open (non-code)
- **Impact**: Potential regulatory issues for children's game.
- **Fix plan**: Legal review needed. Privacy policy, age gate, data minimization.
- **Depends on**: Dragon Family integration (auth, user management).

### MEDIUM-3: Broadcast spoofing via client-side channel

- **Status**: Mitigated
- **Impact**: Reduced — game state is now server-authoritative (DB). Client-side spoofed broadcasts may confuse UI temporarily but cannot affect actual game state.
- **Fix plan**: Add client-side state reconciliation (fetch from server on suspicious events).

### SEC-L1: console.error in production code

- **Status**: Open (low priority)
- **Fix plan**: Add structured logger when setting up observability.

---

## Cheating Analysis (Post-Fix)

| Vector | Before | After |
|---|---|---|
| Roll dice without auth | Trivial (omit sessionId) | **Blocked** (401) |
| Score for other player | Trivial | **Blocked** (403 NOT_YOUR_TURN) |
| Impersonate via leaked session | Trivial (GET response had sessions) | **Blocked** (sessions not exposed) |
| Skip other player's turn | Trivial | **Blocked** (requires valid session) |
| Start game as non-host | Trivial | **Blocked** (host verification required) |
| Direct DB manipulation | Trivial (no RLS) | **Blocked** (RLS enabled, service_role only) |
| Predict dice rolls | Possible (Math.random) | **Blocked** (crypto.randomInt) |
| Broadcast spoofing | Full state corruption | **Mitigated** (UI-only, DB is authoritative) |
| Spam room creation | Unlimited | **Partially open** (no rate limiting) |

---

*Report updated after fix commit `4dce230`*
