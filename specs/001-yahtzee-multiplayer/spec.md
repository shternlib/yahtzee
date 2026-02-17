# Feature Specification: Multiplayer Yahtzee Mobile Web App

**Feature Branch**: `001-yahtzee-multiplayer`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Multiplayer Yahtzee web application for mobile phones with link-based invites, 2-4 players, 3D dice animation, AI bot, bilingual (RU/EN)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Play a Multiplayer Game (Priority: P1)

A player opens the app on their phone, enters their display name, and creates a new game room. The system generates a unique shareable link. The player shares this link with friends via any messenger. Friends open the link, enter their names, and join the room. Once the host starts the game, all players take turns rolling dice and filling their scorecard following classic Yahtzee rules. The game shows real-time updates of all players' actions. At the end of 13 rounds, the player with the highest score wins.

**Why this priority**: This is the core gameplay loop. Without multiplayer game creation and real-time play, the app has no purpose.

**Independent Test**: Can be fully tested by creating a room on one device, joining from another, and playing a complete game. Delivers the primary value of the application.

**Acceptance Scenarios**:

1. **Given** a player on the home screen, **When** they enter a name and tap "Create Game", **Then** a room is created and a shareable link is displayed with copy/share options.
2. **Given** a shareable link, **When** another player opens it on their phone, **Then** they see a "Join Game" screen where they enter their name and join the room lobby.
3. **Given** 2-4 players in a room lobby, **When** the host taps "Start Game", **Then** the game begins and the first player sees the dice roll interface.
4. **Given** it is a player's turn, **When** they tap "Roll", **Then** 5 dice are rolled with 3D animation and results are displayed. The player can hold/release dice and re-roll up to 2 more times.
5. **Given** a player has rolled, **When** they select a scoring category on their scorecard, **Then** the score is calculated and recorded, and the turn passes to the next player. All players see this update in real time.
6. **Given** all players have filled all 13 categories, **When** the last category is filled, **Then** final scores are calculated (including upper section bonus), a winner is declared, and the results screen is shown.

---

### User Story 2 - Roll and Hold Dice with 3D Animation (Priority: P1)

During their turn, a player taps the "Roll" button and sees 5 dice animate in 3D, tumbling and landing on results. The player can tap individual dice to hold them (visually distinguished), then roll the remaining dice. This can happen up to 3 times per turn. After rolling, the player sees which scoring categories are available and what each would score.

**Why this priority**: Dice rolling is the central mechanic of Yahtzee. 3D animation was specifically requested and is key to the user experience.

**Independent Test**: Can be tested by a single player rolling dice, holding some, re-rolling, and seeing correct results and available categories.

**Acceptance Scenarios**:

1. **Given** it is the player's turn and they haven't rolled yet, **When** they tap "Roll", **Then** all 5 dice animate in 3D and show random results (1-6 each).
2. **Given** dice have been rolled, **When** the player taps a die, **Then** it is visually marked as "held" (e.g., highlighted border, moved to a separate area). Tapping again releases it.
3. **Given** some dice are held and roll count is less than 3, **When** the player taps "Roll" again, **Then** only unheld dice animate and show new results. Held dice remain unchanged.
4. **Given** the player has rolled 3 times, **When** they look at the roll button, **Then** it is disabled and they must select a scoring category.
5. **Given** dice show results after any roll, **When** the player views the scorecard, **Then** available categories show potential scores for the current dice combination. Already-filled categories are grayed out.

---

### User Story 3 - Play Against AI Bot (Priority: P2)

A player who doesn't have friends available can start a game with 1-3 AI bots. The bots make strategic decisions (which dice to hold, which category to choose) with reasonable intelligence. The game flow is the same as multiplayer but bot turns are animated briefly so the player can follow the action.

**Why this priority**: Provides value for solo players and allows practicing without needing other people. Secondary to the core multiplayer experience.

**Independent Test**: Can be tested by a single player starting a game with bots and playing through all 13 rounds, verifying bots make valid moves and the game completes correctly.

**Acceptance Scenarios**:

1. **Given** a player on the home screen, **When** they select "Play with Bots" and choose the number of bots (1-3), **Then** a game starts immediately with the bots as opponents.
2. **Given** it is a bot's turn, **When** the bot plays, **Then** the dice roll animation plays (abbreviated, ~1 second), the bot holds strategic dice, re-rolls if beneficial, and selects an appropriate category. The player can see each step.
3. **Given** a bot must choose a category, **When** it evaluates options, **Then** it selects a category that maximizes its expected total score (not random, but doesn't need to be optimal).

---

### User Story 4 - Scorecard Management (Priority: P1)

Each player has a personal scorecard visible throughout the game. The scorecard shows the classic Yahtzee layout: upper section (Ones through Sixes), upper section bonus (63+ points = 35 bonus), lower section (Three of a Kind, Four of a Kind, Full House, Small Straight, Large Straight, Yahtzee, Chance). Players can view all opponents' scorecards at any time.

**Why this priority**: The scorecard is how progress is tracked and strategies are formed. Essential to the game.

**Independent Test**: Can be tested by playing through a game and verifying all scores are calculated correctly, the bonus is applied correctly, and opponent cards are viewable.

**Acceptance Scenarios**:

1. **Given** a game is in progress, **When** a player views their scorecard, **Then** they see all 13 categories with filled scores and empty slots for remaining categories.
2. **Given** the upper section scores total 63 or more, **When** the bonus is calculated, **Then** 35 bonus points are added to the upper section total.
3. **Given** a player wants to check opponent progress, **When** they tap on an opponent's name/avatar, **Then** they see that opponent's full scorecard.
4. **Given** a player must select a category but no categories match their dice, **When** they select a category anyway, **Then** a zero is recorded for that category ("scratching").
5. **Given** all categories are filled, **When** the final total is calculated, **Then** it includes upper section total + upper bonus + lower section total.

---

### User Story 5 - Language Switching (Priority: P3)

Users can switch between Russian and English at any time. All game interface elements, category names, instructions, and system messages are translated. The language preference is saved locally so it persists between sessions.

**Why this priority**: Important for accessibility but not blocking core gameplay. Can be added after core features work.

**Independent Test**: Can be tested by switching languages and verifying all UI text changes correctly.

**Acceptance Scenarios**:

1. **Given** a user is on any screen, **When** they tap the language toggle, **Then** all interface text switches between Russian and English immediately.
2. **Given** a user selected Russian, **When** they close and reopen the app, **Then** the language is still Russian.
3. **Given** a game with players using different languages, **When** the game is in progress, **Then** each player sees the interface in their own selected language independently.

---

### User Story 6 - Room Lobby and Game Management (Priority: P2)

After creating a room, the host sees a lobby where joined players appear in real-time. The host can see how many players have joined (out of 4 max). The host can start the game once at least 2 players are present. If a player disconnects during the game, their turn is automatically skipped after a timeout. Players can reconnect to an ongoing game.

**Why this priority**: Lobby management is essential for a smooth multiplayer experience but is secondary to the core game mechanics.

**Independent Test**: Can be tested by creating a room, having players join/leave, and verifying lobby updates correctly.

**Acceptance Scenarios**:

1. **Given** a host created a room, **When** a new player joins via the link, **Then** the lobby updates in real-time showing the new player's name.
2. **Given** 2+ players are in the lobby, **When** the host taps "Start Game", **Then** the game begins for all players simultaneously.
3. **Given** fewer than 2 players in the lobby, **When** the host looks at "Start Game", **Then** the button is disabled with a message "Need at least 2 players".
4. **Given** the room has 4 players, **When** another player opens the invite link, **Then** they see a message "Room is full".
5. **Given** a player disconnects during the game, **When** it becomes their turn, **Then** the system waits 30 seconds, then automatically skips their turn (scores 0 in Chance or the lowest-impact available category).
6. **Given** a disconnected player, **When** they reopen the game link, **Then** they rejoin the active game and can continue playing from their next turn.

---

### Edge Cases

- What happens when the host disconnects? Host role transfers to the next player.
- What happens when all players except one disconnect? The remaining player wins by default.
- What happens if a player closes the browser during their turn? 30-second timeout, then auto-skip.
- What happens on poor network connection? Optimistic UI updates with retry logic. Show "reconnecting..." indicator.
- What happens if the invite link is opened after the game has ended? Show the final results screen with option to create a new game.
- What happens if a player tries to join with the same name as someone already in the room? Append a number to make it unique (e.g., "Alex" -> "Alex 2").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow creating a game room that generates a unique shareable link.
- **FR-002**: System MUST support 2-4 players per game (humans and/or bots).
- **FR-003**: System MUST implement classic Yahtzee rules with 13 scoring categories: Ones, Twos, Threes, Fours, Fives, Sixes (upper section); Three of a Kind, Four of a Kind, Full House, Small Straight, Large Straight, Yahtzee, Chance (lower section).
- **FR-004**: System MUST provide 5 dice per player with up to 3 rolls per turn, with ability to hold/release individual dice between rolls.
- **FR-005**: System MUST render 3D animated dice rolls on mobile devices.
- **FR-006**: System MUST synchronize game state in real-time across all connected players.
- **FR-007**: System MUST correctly calculate scores for all Yahtzee categories including upper section bonus (35 points when upper section total >= 63).
- **FR-008**: System MUST support AI bot opponents with strategic decision-making for solo play.
- **FR-009**: System MUST support bilingual interface (Russian and English) with persistent language preference.
- **FR-010**: System MUST handle player disconnection gracefully with 30-second timeout and automatic turn skip.
- **FR-011**: System MUST allow disconnected players to reconnect to an ongoing game.
- **FR-012**: System MUST be mobile-first with responsive design optimized for phone screens.
- **FR-013**: System MUST not require user registration or authentication - players identify by display name only.
- **FR-014**: System MUST show real-time updates of opponent actions (dice rolls, category selections).
- **FR-015**: System MUST display available scoring options with calculated potential scores after each roll.

### Key Entities

- **Game Room**: A unique game session identified by a shareable code/link. Contains 2-4 players, game state, and turn order. Has states: lobby, in-progress, completed.
- **Player**: A participant identified by display name and session. Can be human or bot. Has a personal scorecard.
- **Scorecard**: 13 scoring categories divided into upper and lower sections. Tracks filled/unfilled status and scores for each category. Calculates totals and bonuses.
- **Dice Set**: 5 dice per turn, each showing values 1-6. Tracks held/unheld state. Resets each turn.
- **Turn**: A single player's action within a round. Consists of up to 3 dice rolls and one category selection. Has a timeout for disconnected players.

### Assumptions

- Players have modern smartphones with WebGL support for 3D dice rendering.
- Network latency under 500ms is acceptable for real-time synchronization.
- Game rooms expire after 24 hours of inactivity.
- No persistent player profiles or history - each game session is independent.
- Dice randomness uses server-side generation to prevent manipulation.
- Bot difficulty is fixed at "medium" level (not configurable).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can create a room and share a link within 10 seconds of opening the app.
- **SC-002**: Players joining via link are in the lobby within 5 seconds of opening the link.
- **SC-003**: Dice roll animation completes within 2 seconds on average mobile device.
- **SC-004**: Real-time game state updates reach all players within 1 second.
- **SC-005**: A complete 4-player game (13 rounds) can be finished within 30 minutes.
- **SC-006**: 95% of users can understand and start playing without any tutorial (intuitive UI).
- **SC-007**: The app loads and is interactive within 3 seconds on a 4G connection.
- **SC-008**: 3D dice animation runs at 30+ FPS on devices from the last 3 years.
- **SC-009**: A disconnected player can rejoin and resume within 10 seconds.
- **SC-010**: Bot opponents complete their turns within 3 seconds.
