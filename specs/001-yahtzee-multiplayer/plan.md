# Implementation Plan: Multiplayer Yahtzee Mobile Web App

**Branch**: `001-yahtzee-multiplayer` | **Date**: 2026-02-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-yahtzee-multiplayer/spec.md`

## Summary

Build a mobile-first multiplayer Yahtzee web app using Next.js (App Router) and Supabase. Players create/join rooms via shareable links (no registration), play classic Yahtzee with 3D dice animations (`@3d-dice/dice-box-threejs`), and see real-time opponent actions via Supabase Broadcast/Presence. Supports 2-4 players (humans and/or AI bots), bilingual interface (RU/EN via `next-intl`), and graceful disconnect/reconnect handling with 30-second turn timeouts.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22.x
**Primary Dependencies**: Next.js 14/15 (App Router), Supabase JS v2, @3d-dice/dice-box-threejs ^1.0.0, next-intl ^3.0.0, Tailwind CSS ^3.0.0
**Storage**: Supabase Postgres (rooms, players, final scores) + Supabase Broadcast (ephemeral game state)
**Testing**: Vitest (unit), Playwright (e2e)
**Target Platform**: Mobile web browsers (iOS Safari, Android Chrome) with WebGL support
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: 3D dice at 30+ FPS on 3-year-old devices, <1s realtime sync, <3s initial load on 4G, <2s dice animation
**Constraints**: Supabase free tier (200 concurrent connections, 1K msg/sec, 500MB DB), Vercel free tier hosting
**Scale/Scope**: Pet project — ~50 concurrent games max, ~8 screens (home, lobby, game, scorecard, results, join, language settings, error)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No project constitution has been defined (template placeholders only). No gates to evaluate. Proceeding without violations.

**Post-Design Re-check**: No constitution gates to re-evaluate. Design artifacts (data-model.md, contracts/api.md) are consistent with the spec requirements and technical context above.

## Project Structure

### Documentation (this feature)

```text
specs/001-yahtzee-multiplayer/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technology research decisions
├── data-model.md        # Phase 1: Entity models and DB schema
├── quickstart.md        # Phase 1: Developer quickstart guide
├── contracts/
│   └── api.md           # Phase 1: REST API + Realtime event contracts
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # i18n locale routing
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── page.tsx              # Home screen (create/join game)
│   │   └── game/
│   │       └── [code]/
│   │           └── page.tsx      # Game room (lobby + gameplay + results)
│   ├── api/
│   │   └── rooms/
│   │       ├── route.ts          # POST /api/rooms (create room)
│   │       └── [code]/
│   │           ├── route.ts      # GET /api/rooms/:code (room state)
│   │           ├── join/
│   │           │   └── route.ts  # POST /api/rooms/:code/join
│   │           ├── start/
│   │           │   └── route.ts  # POST /api/rooms/:code/start
│   │           ├── bot/
│   │           │   └── route.ts  # POST /api/rooms/:code/bot
│   │           ├── roll/
│   │           │   └── route.ts  # POST /api/rooms/:code/roll
│   │           └── score/
│   │               └── route.ts  # POST /api/rooms/:code/score
│   └── globals.css               # Tailwind + global styles
├── components/
│   ├── dice/
│   │   ├── DiceScene.tsx         # 3D dice renderer (dice-box-threejs wrapper)
│   │   └── DiceControls.tsx      # Hold/release dice UI
│   ├── scorecard/
│   │   ├── Scorecard.tsx         # Full scorecard display
│   │   └── CategoryRow.tsx       # Individual category row
│   ├── game/
│   │   ├── GameBoard.tsx         # Main game layout
│   │   ├── TurnIndicator.tsx     # Whose turn + roll count
│   │   └── PlayerList.tsx        # Player avatars/status
│   ├── lobby/
│   │   ├── LobbyView.tsx         # Pre-game lobby
│   │   └── ShareLink.tsx         # Copy/share invite link
│   ├── results/
│   │   └── ResultsView.tsx       # End-game results screen
│   └── ui/
│       ├── LanguageToggle.tsx    # RU/EN language switcher
│       └── ReconnectBanner.tsx   # "Reconnecting..." indicator
├── lib/
│   ├── yahtzee/
│   │   ├── scoring.ts            # Score calculation for all 13 categories
│   │   ├── bot.ts                # Bot AI (greedy heuristic strategy)
│   │   ├── categories.ts         # Category definitions and validation
│   │   └── dice.ts               # Dice generation (server-side RNG)
│   ├── supabase/
│   │   ├── client.ts             # Supabase client (browser)
│   │   ├── server.ts             # Supabase client (server/API routes)
│   │   └── realtime.ts           # Channel setup, broadcast, presence helpers
│   └── utils/
│       ├── room-code.ts          # Room code generation (6-char alphanumeric)
│       └── session.ts            # Anonymous session management
├── context/
│   ├── GameContext.tsx            # Game state provider (useReducer)
│   └── gameReducer.ts            # Game state reducer (actions, state transitions)
├── hooks/
│   ├── useGameChannel.ts         # Supabase realtime channel hook
│   ├── usePresence.ts            # Player presence tracking hook
│   └── useLocale.ts              # Language preference persistence hook
├── messages/
│   ├── en.json                   # English translations
│   └── ru.json                   # Russian translations
├── middleware.ts                  # next-intl locale middleware
└── i18n.ts                       # next-intl configuration

supabase/
└── migrations/
    └── 001_initial_schema.sql    # game_rooms, players, game_scores tables + indexes

tests/
├── unit/
│   ├── scoring.test.ts           # Yahtzee scoring logic tests
│   ├── bot.test.ts               # Bot AI decision tests
│   └── gameReducer.test.ts       # State reducer tests
├── integration/
│   ├── api-rooms.test.ts         # Room creation/joining API tests
│   └── api-gameplay.test.ts      # Roll/score API tests
└── e2e/
    ├── create-and-join.spec.ts   # Full room lifecycle
    └── gameplay.spec.ts           # Full game play-through
```

**Structure Decision**: Next.js App Router single-project structure with colocated API routes. Game logic is isolated in `src/lib/yahtzee/` for independent unit testing. Supabase integration is centralized in `src/lib/supabase/`. The `[locale]` dynamic segment enables URL-based i18n routing via `next-intl`.

## Complexity Tracking

> No constitution violations to track. Design uses standard Next.js patterns with minimal custom infrastructure.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| In-memory scorecards | Broadcast state, not DB | Reduces DB writes within Supabase free tier; persisted only at game end |
| Server-side dice RNG | API route generates values | Prevents client-side manipulation in multiplayer |
| No WebSocket server | Supabase Broadcast/Presence | Avoids custom infra; works on Vercel serverless |
