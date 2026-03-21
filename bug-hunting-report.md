---
report_type: bug-hunting
generated: 2026-03-21
updated: 2026-03-21
version: 2026-03-21-v2
status: resolved
agent: bug-hunter
files_processed: 42
issues_found: 23
issues_fixed: 20
issues_remaining: 3
critical_count: 0
high_count: 0
medium_count: 2
low_count: 1
modifications_made: true
---

# Bug Hunting Report (Updated)

**Generated**: 2026-03-21 | **Updated**: 2026-03-21
**Project**: Dragon Dice (Multiplayer Yahtzee)
**Commit**: `4dce230`

---

## Summary

Out of 23 bugs found, **20 fixed**, **3 remaining** (no critical or high).

---

## Fixed Issues

| ID | Priority | Issue | Fix |
|---|---|---|---|
| CRITICAL-1 | Critical | Score API не бродкастит score_update | Added serverBroadcast in score/route.ts |
| CRITICAL-2 | Critical | Roll API не бродкастит dice_roll | Added serverBroadcast in roll/route.ts |
| CRITICAL-3 | Critical | In-memory state lost on restart | Migrated to DB game_state JSONB column |
| CRITICAL-4 | Critical | Skip API не бродкастит | Added serverBroadcast in skip/route.ts |
| HIGH-1 | High | Race condition in-memory state | Eliminated with DB-persisted state |
| HIGH-2 | High | Round advancement breaks with non-contiguous indices | Use sorted player indices array |
| HIGH-3 | High | sessionId optional (auth bypass) | Made required, return 401 |
| HIGH-4 | High | serverBroadcast subscribe/send race | Wait for SUBSCRIBED status |
| HIGH-5 | High | Start не бродкастит game_start | Added serverBroadcast in start/route.ts |
| HIGH-6 | High | Bot join не бродкастит player_joined | Added serverBroadcast in bot/route.ts |
| HIGH-7 | High | Human join не бродкастит player_joined | Added serverBroadcast in join/route.ts |
| MEDIUM-2 | Medium | usePresence resubscription churn | Stabilized dependencies with refs |
| MEDIUM-3 | Medium | `undefined as any` for state cleanup | Created deleteRoomState with Map.delete |
| MEDIUM-4 | Medium | Unnecessary `as any` on INTERNAL_ERROR | Removed casts |
| MEDIUM-5 | Medium | Auto-skip timer resets on hold toggle | Fixed dependency to playerIndex only |
| MEDIUM-6 | Medium | No name sanitization | Added sanitizeDisplayName utility |
| MEDIUM-7 | Medium | Math.random() for room codes | crypto.randomInt() |
| MEDIUM-8 | Medium | DB CHECK 1-13 conflicts with round > 13 | Extended to 1-14 |
| LOW-2 | Low | self:true causes double-dispatch | Changed to self:false |
| LOW-3 | Low | Name not pre-filled from localStorage | Added useEffect with getStoredPlayerName |
| LOW-4 | Low | Duplicate buttons in ResultsView | Removed duplicate |

---

## Remaining Issues

### MEDIUM-1: Missing Yahtzee Bonus rule

- **Status**: Won't fix (intentional)
- **Reason**: Game uses simplified Yahtzee rules without the bonus Yahtzee mechanic. Documented in GDD as intentional simplification for children's audience.

### LOW-1: eslint config not verified

- **Status**: Open (low priority)
- **Impact**: Lint issues may go undetected.

### SEC-L1: console.error in production

- **Status**: Open (low priority)
- **Impact**: Bot execution errors logged with console.error instead of structured logger.

---

*Report updated after fix commit `4dce230`*
