# Research: Multiplayer Yahtzee Mobile Web App

**Date**: 2026-02-16
**Branch**: `001-yahtzee-multiplayer`

## R1: 3D Dice Animation Library

**Decision**: Use `@3d-dice/dice-box-threejs` v1.x

**Rationale**:
- Built on Three.js + Cannon-ES (physics engine) - the de facto standard for WebGL in React
- 918 weekly npm downloads - niche but actively maintained
- Compatible with React via documented React demo patterns
- Supports: d6 dice, customizable themes, physics-based animation, touch events
- Alternative `@3d-dice/dice-box` (2,300 weekly downloads) uses Babylon.js - heavier for a Next.js project
- Three.js version integrates better with React Three Fiber ecosystem if needed

**Alternatives Considered**:
- `@3d-dice/dice-box` (Babylon.js) - 2.3K weekly downloads, but Babylon.js adds ~500KB vs Three.js's ~200KB
- Custom Three.js + Cannon-ES - full control but ~2 weeks of work
- React Three Fiber + custom dice mesh - more React-idiomatic but requires 3D modeling expertise
- CSS 3D transforms - simpler but not truly 3D, no physics

**Library**: `@3d-dice/dice-box-threejs@^1.0.0`

**Risk**: Low download count. Mitigation: the core Three.js + Cannon-ES dependency is solid; if the wrapper is abandoned, replacing it is feasible with direct Three.js code.

---

## R2: Real-time Multiplayer with Supabase

**Decision**: Hybrid approach - Broadcast + Presence + Postgres Changes

**Rationale**:
- **Broadcast** for game actions (dice rolls, score updates, turn changes) - 50-100ms latency, no DB overhead
- **Presence** for player tracking (online status, room membership) - automatic disconnect handling after ~30s
- **Postgres Changes** for persistent data (final scores only) - guaranteed delivery

**Architecture**:
- Single channel per room: `game:room:{roomId}` with Broadcast + Presence
- Broadcast events: `dice_roll`, `score_update`, `turn_change`, `game_start`, `game_end`
- Presence tracks: player name, ready status, connection state
- DB writes only at game end (final scores) - conserves free tier

**Free Tier Limits** (sufficient for pet project):
- 200 concurrent connections = ~50 simultaneous 4-player games
- 1,000 messages/second = ~20 msg/sec per room (more than enough for turn-based)
- 500 MB database = 10K+ game sessions

**Key Pattern**: No authentication required. Use anonymous sessions with `supabase.auth.signInAnonymously()` for Supabase channel access.

---

## R3: Internationalization (i18n)

**Decision**: Use `next-intl` v3.x

**Rationale**:
- Built specifically for Next.js App Router (not retrofitted from Pages Router)
- ~500K+ weekly npm downloads, actively maintained
- Native TypeScript support with type-safe translations
- Client-side language switching without page reload via `useRouter().replace()`
- Local storage persistence with simple custom hook (~10 lines)
- Zero runtime overhead for Server Components

**Alternatives Considered**:
- `react-i18next` (3M+ downloads) - NOT designed for App Router, requires workarounds for RSC
- `next-international` (20K downloads) - good TypeScript, but much smaller community
- Built-in Next.js i18n - removed in App Router

**Library**: `next-intl@^3.0.0`

**Implementation**: URL-based locale routing (`/en/game`, `/ru/game`) with middleware, JSON translation files per locale.

---

## R4: Yahtzee Game Logic & Scoring

**Decision**: Custom implementation (no library)

**Rationale**:
- `yahtzee-api` (31 weekly downloads) - has TypeScript + ComputerPlayer, but extremely low adoption, private GitLab repo, tight coupling to its own Game class
- Yahtzee scoring is simple deterministic logic (~150 lines of TypeScript)
- Custom implementation gives full control over:
  - Score calculation for all 13 categories
  - Bot AI strategy
  - State management integration
  - Server-side dice generation

**Scoring Rules (13 categories)**:

Upper Section:
1. **Ones** - Sum of all 1s
2. **Twos** - Sum of all 2s
3. **Threes** - Sum of all 3s
4. **Fours** - Sum of all 4s
5. **Fives** - Sum of all 5s
6. **Sixes** - Sum of all 6s
7. **Upper Bonus** - 35 points if upper total >= 63

Lower Section:
8. **Three of a Kind** - Sum of all dice (if 3+ of same value)
9. **Four of a Kind** - Sum of all dice (if 4+ of same value)
10. **Full House** - 25 points (3 of one + 2 of another)
11. **Small Straight** - 30 points (4 consecutive values)
12. **Large Straight** - 40 points (5 consecutive values)
13. **Yahtzee** - 50 points (all 5 same value)
14. **Chance** - Sum of all dice (no requirements)

**Bot Strategy**: Greedy heuristic approach:
1. Evaluate expected value for each unfilled category given current dice
2. Determine optimal hold pattern for each category
3. Select category with highest marginal value (actual score / max possible score)
4. For re-rolls: hold dice that contribute to the highest-value target category

---

## R5: Tech Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 14.x / 15.x |
| Backend/DB | Supabase (Postgres + Realtime) | Latest |
| 3D Dice | @3d-dice/dice-box-threejs | ^1.0.0 |
| i18n | next-intl | ^3.0.0 |
| Styling | Tailwind CSS | ^3.0.0 |
| State | React Context + useReducer | Built-in |
| Hosting | Vercel (free tier) | - |
| Game Logic | Custom TypeScript | - |
| Bot AI | Custom greedy heuristic | - |

**No additional libraries needed** - keeping dependencies minimal for a pet project.
