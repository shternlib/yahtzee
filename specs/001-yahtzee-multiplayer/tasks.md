# Tasks: Multiplayer Yahtzee

**Branch**: `001-yahtzee-multiplayer`
**Date**: 2026-02-16
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Phase 0: Project Setup

- [x] **T-001**: Initialize Next.js project with TypeScript, Tailwind CSS, ESLint, App Router, src directory
  - `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - Files: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`

- [x] **T-002**: Install project dependencies
  - Runtime: `@supabase/supabase-js`, `next-intl`
  - Dev: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
  - Files: `package.json`

- [x] **T-003**: Create .env.local template and .gitignore updates
  - Files: `.env.local.example`, `.gitignore`

- [x] **T-004**: Create Supabase migration file
  - Files: `supabase/migrations/001_initial_schema.sql`
  - Source: data-model.md schema

- [x] **T-005**: Configure Vitest
  - Files: `vitest.config.ts`, `tsconfig.json`

## Phase 1: Game Logic (Pure TypeScript, no dependencies) [P]

- [x] **T-006**: Implement Yahtzee category definitions and types [P]
  - Files: `src/lib/yahtzee/categories.ts`
  - Types: Category enum, ScorecardData interface, scoring category metadata

- [x] **T-007**: Implement Yahtzee scoring engine [P]
  - Files: `src/lib/yahtzee/scoring.ts`
  - All 13 categories + upper bonus + totals
  - `calculateScore(dice, category)`, `calculateAvailableScores(dice, scorecard)`, `calculateTotals(scorecard)`

- [x] **T-008**: Implement dice utilities [P]
  - Files: `src/lib/yahtzee/dice.ts`
  - `rollDice(held)`, `generateDice()` — server-side RNG

- [x] **T-009**: Implement room code generator [P]
  - Files: `src/lib/utils/room-code.ts`
  - 6-char alphanumeric, collision-resistant

- [x] **T-010**: Write unit tests for scoring engine
  - Files: `tests/unit/scoring.test.ts`
  - Cover all 13 categories, edge cases, bonus calculation (33 tests)

- [x] **T-011**: Implement bot AI (greedy heuristic) [P]
  - Files: `src/lib/yahtzee/bot.ts`
  - `chooseDiceToHold(dice, scorecard)`, `chooseCategory(dice, scorecard)`
  - Greedy: pick highest marginal value category

- [x] **T-012**: Write unit tests for bot AI
  - Files: `tests/unit/bot.test.ts` (10 tests)

## Phase 2: Supabase Integration

- [x] **T-013**: Create Supabase client utilities
  - Files: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (API routes)
  - Anonymous auth helper

- [x] **T-014**: Create session management utility
  - Files: `src/lib/utils/session.ts`
  - `getStoredSessionId()`, `storeSessionId()`, localStorage persistence

- [x] **T-015**: Create realtime helpers
  - Files: `src/lib/supabase/realtime.ts`
  - `createGameChannel(roomCode)`, broadcast/presence helpers

## Phase 3: API Routes

- [x] **T-016**: POST /api/rooms — Create room
  - Files: `src/app/api/rooms/route.ts`
  - Validates hostName, generates room code, inserts to DB, creates host player

- [x] **T-017**: POST /api/rooms/[code]/join — Join room
  - Files: `src/app/api/rooms/[code]/join/route.ts`
  - Validates room exists, not full, not started; adds player; deduplicates names

- [x] **T-018**: POST /api/rooms/[code]/start — Start game
  - Files: `src/app/api/rooms/[code]/start/route.ts`
  - Host-only, validates 2+ players, sets status=playing

- [x] **T-019**: POST /api/rooms/[code]/bot — Add bot
  - Files: `src/app/api/rooms/[code]/bot/route.ts`
  - Host-only, adds bot player

- [x] **T-020**: GET /api/rooms/[code] — Get room state
  - Files: `src/app/api/rooms/[code]/route.ts`
  - Returns room + players + scorecards

- [x] **T-021**: POST /api/rooms/[code]/roll — Roll dice
  - Files: `src/app/api/rooms/[code]/roll/route.ts`
  - Validates turn, generates dice server-side, returns available categories

- [x] **T-022**: POST /api/rooms/[code]/score — Select category
  - Files: `src/app/api/rooms/[code]/score/route.ts`
  - Validates turn + category, scores, advances turn/round, persists final scores on game end

## Phase 4: Game State Management

- [x] **T-023**: Create game state types and reducer
  - Files: `src/context/gameReducer.ts`
  - Actions: DICE_ROLLED, TOGGLE_HOLD, SCORE_SELECTED, PLAYER_JOINED, GAME_START, GAME_END, etc.

- [x] **T-024**: Create GameContext provider
  - Files: `src/context/GameContext.tsx`
  - Wraps reducer + provides useGame() hook

- [x] **T-025**: Create useGameChannel hook
  - Files: `src/hooks/useGameChannel.ts`
  - Subscribe to broadcast events, update game state

- [x] **T-026**: Create usePresence hook
  - Files: `src/hooks/usePresence.ts`
  - Track player online/offline status

## Phase 5: i18n Setup

- [x] **T-027**: Configure next-intl v4
  - Files: `src/i18n/request.ts`, `src/i18n/routing.ts`, `src/middleware.ts`, `next.config.ts`
  - Locale routing: `/en/...`, `/ru/...`

- [x] **T-028**: Create translation files
  - Files: `src/messages/en.json`, `src/messages/ru.json`
  - All UI strings: home, lobby, game, scorecard, results, errors

## Phase 6: UI Components

- [x] **T-029**: Create root layout with providers
  - Files: `src/app/[locale]/layout.tsx`
  - NextIntlClientProvider, GameContext, mobile viewport meta

- [x] **T-030**: Create home page — create/join game
  - Files: `src/app/[locale]/page.tsx`
  - Name input, "Create Game", "Play with Bots", "Join by Code"

- [x] **T-031**: Create lobby components
  - Files: `src/components/lobby/LobbyView.tsx`, `src/components/lobby/ShareLink.tsx`
  - Player list, share link, add bot button, start game button (host)

- [x] **T-032**: Create scorecard components
  - Files: `src/components/scorecard/Scorecard.tsx`, `src/components/scorecard/CategoryRow.tsx`
  - 13 categories, upper/lower sections, totals, bonus, available scores highlight

- [x] **T-033**: Create game board layout
  - Files: `src/components/game/GameBoard.tsx`, `src/components/game/TurnIndicator.tsx`, `src/components/game/PlayerList.tsx`
  - Mobile layout: players top, dice middle, scorecard bottom

- [x] **T-034**: Create dice UI components (CSS animated 2D dice)
  - Files: `src/components/dice/DiceScene.tsx`, `src/components/dice/DiceControls.tsx`
  - CSS animated dice faces with dot patterns, hold/release tap, roll button

- [x] **T-035**: Create results screen
  - Files: `src/components/results/ResultsView.tsx`
  - Final scores, winner highlight, "Play Again" button

- [x] **T-036**: Create game page (combines lobby + game + results)
  - Files: `src/app/[locale]/game/[code]/page.tsx`
  - Routes between lobby/playing/finished states, handles room loading + join flow

- [x] **T-037**: Create UI utilities
  - Files: `src/components/ui/LanguageToggle.tsx`
  - RU/EN language switcher

## Phase 7: Integration & Polish

- [x] **T-038**: Wire realtime events to game board
  - GameBoard dispatches to context, useGameChannel listens to broadcast events

- [x] **T-039**: Implement bot turn execution on server
  - When it's a bot's turn, server auto-plays using bot AI
  - → Artifacts: [botExecutor.ts](../../src/lib/yahtzee/botExecutor.ts), [serverBroadcast.ts](../../src/lib/supabase/serverBroadcast.ts)

- [x] **T-040**: Implement disconnect/reconnect handling
  - Presence leave -> mark disconnected, 30s timeout -> auto-skip turn
  - → Artifacts: [skip/route.ts](../../src/app/api/rooms/[code]/skip/route.ts)

- [x] **T-041**: Mobile responsive polish
  - Touch targets (min 44px), viewport meta, safe areas, dark theme

- [x] **T-042**: Error handling and edge cases
  - Room not found, room full, game ended, network errors, duplicate names

- [x] **T-043**: Build validation and final check
  - `npm run build` passes (0 errors), 43 unit tests pass
