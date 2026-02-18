import type { Category, ScorecardData } from '@/lib/yahtzee/categories'
import { createEmptyScorecard } from '@/lib/yahtzee/categories'

export interface PlayerInfo {
  id: string
  displayName: string
  playerIndex: number
  isBot: boolean
  isConnected: boolean
  sessionId?: string
}

export interface TurnState {
  playerIndex: number
  dice: number[]
  held: boolean[]
  rollCount: number
}

export interface LastMove {
  category: Category
  score: number
}

export interface GameState {
  roomCode: string
  roomId: string
  status: 'lobby' | 'playing' | 'finished'
  players: PlayerInfo[]
  currentTurn: TurnState
  scorecards: Record<number, ScorecardData>
  lastMoves: Record<number, LastMove>
  round: number
  myPlayerIndex: number | null
  mySessionId: string | null
  hostSessionId: string | null
  availableCategories: Partial<Record<Category, number>>
  winner: number | null
  finalScores: { playerIndex: number; grandTotal: number }[] | null
}

export type GameAction =
  | { type: 'SET_ROOM'; payload: { roomCode: string; roomId: string; hostSessionId: string; players: PlayerInfo[]; status: string } }
  | { type: 'SET_MY_SESSION'; payload: { sessionId: string; playerIndex: number } }
  | { type: 'PLAYER_JOINED'; payload: PlayerInfo }
  | { type: 'PLAYER_LEFT'; payload: { playerIndex: number } }
  | { type: 'GAME_START'; payload: { turnOrder: number[]; firstPlayer: number } }
  | { type: 'DICE_ROLLED'; payload: { dice: number[]; rollCount: number; availableCategories: Partial<Record<Category, number>> } }
  | { type: 'TOGGLE_HOLD'; payload: { dieIndex: number } }
  | { type: 'SCORE_SELECTED'; payload: { playerIndex: number; category: Category; score: number; nextPlayerIndex: number; round: number; gameFinished: boolean } }
  | { type: 'GAME_END'; payload: { scores: { playerIndex: number; grandTotal: number }[]; winner: number } }
  | { type: 'PLAYER_CONNECTED'; payload: { playerIndex: number } }
  | { type: 'PLAYER_DISCONNECTED'; payload: { playerIndex: number } }

export const initialGameState: GameState = {
  roomCode: '',
  roomId: '',
  status: 'lobby',
  players: [],
  currentTurn: {
    playerIndex: 0,
    dice: [0, 0, 0, 0, 0],
    held: [false, false, false, false, false],
    rollCount: 0,
  },
  scorecards: {},
  lastMoves: {},
  round: 1,
  myPlayerIndex: null,
  mySessionId: null,
  hostSessionId: null,
  availableCategories: {},
  winner: null,
  finalScores: null,
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_ROOM': {
      const scorecards: Record<number, ScorecardData> = {}
      for (const p of action.payload.players) {
        scorecards[p.playerIndex] = createEmptyScorecard()
      }
      return {
        ...state,
        roomCode: action.payload.roomCode,
        roomId: action.payload.roomId,
        hostSessionId: action.payload.hostSessionId,
        status: action.payload.status as GameState['status'],
        players: action.payload.players,
        scorecards,
      }
    }

    case 'SET_MY_SESSION':
      return {
        ...state,
        mySessionId: action.payload.sessionId,
        myPlayerIndex: action.payload.playerIndex,
      }

    case 'PLAYER_JOINED': {
      if (state.players.some((p) => p.playerIndex === action.payload.playerIndex)) {
        return state
      }
      const newPlayers = [...state.players, action.payload]
      return {
        ...state,
        players: newPlayers,
        scorecards: {
          ...state.scorecards,
          [action.payload.playerIndex]: createEmptyScorecard(),
        },
      }
    }

    case 'PLAYER_LEFT':
      return {
        ...state,
        players: state.players.filter((p) => p.playerIndex !== action.payload.playerIndex),
      }

    case 'GAME_START':
      return {
        ...state,
        status: 'playing',
        currentTurn: {
          playerIndex: action.payload.firstPlayer,
          dice: [0, 0, 0, 0, 0],
          held: [false, false, false, false, false],
          rollCount: 0,
        },
        round: 1,
      }

    case 'DICE_ROLLED':
      return {
        ...state,
        currentTurn: {
          ...state.currentTurn,
          dice: action.payload.dice,
          rollCount: action.payload.rollCount,
        },
        availableCategories: action.payload.availableCategories,
      }

    case 'TOGGLE_HOLD': {
      if (state.currentTurn.rollCount === 0) return state // can't hold before rolling
      const newHeld = [...state.currentTurn.held]
      newHeld[action.payload.dieIndex] = !newHeld[action.payload.dieIndex]
      return {
        ...state,
        currentTurn: { ...state.currentTurn, held: newHeld },
      }
    }

    case 'SCORE_SELECTED': {
      const { playerIndex, category, score, nextPlayerIndex, round, gameFinished } = action.payload
      const updatedScorecard = {
        ...state.scorecards[playerIndex],
        [category]: score,
      }
      return {
        ...state,
        scorecards: { ...state.scorecards, [playerIndex]: updatedScorecard },
        lastMoves: { ...state.lastMoves, [playerIndex]: { category, score } },
        round,
        status: gameFinished ? 'finished' : state.status,
        currentTurn: gameFinished
          ? state.currentTurn
          : {
              playerIndex: nextPlayerIndex,
              dice: [0, 0, 0, 0, 0],
              held: [false, false, false, false, false],
              rollCount: 0,
            },
        availableCategories: {},
      }
    }

    case 'GAME_END':
      return {
        ...state,
        status: 'finished',
        winner: action.payload.winner,
        finalScores: action.payload.scores,
      }

    case 'PLAYER_CONNECTED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.playerIndex === action.payload.playerIndex ? { ...p, isConnected: true } : p
        ),
      }

    case 'PLAYER_DISCONNECTED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.playerIndex === action.payload.playerIndex ? { ...p, isConnected: false } : p
        ),
      }

    default:
      return state
  }
}
