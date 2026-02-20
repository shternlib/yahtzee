import type { Category, ScorecardData } from '@/lib/yahtzee/categories'
import { createEmptyScorecard } from '@/lib/yahtzee/categories'
import { calculateScore, calculateAvailableScores, calculateTotals, isScorecardComplete } from '@/lib/yahtzee/scoring'

export interface LocalGameState {
  status: 'setup' | 'playing' | 'finished'
  players: string[]
  currentPlayerIndex: number
  round: number
  dice: number[]
  scorecards: Record<number, ScorecardData>
  lastMoves: Record<number, { category: Category; score: number }>
  availableCategories: Partial<Record<Category, number>>
  finalScores: { playerIndex: number; grandTotal: number }[]
  winner: number | null
}

export type LocalGameAction =
  | { type: 'ADD_PLAYER'; payload: { name: string } }
  | { type: 'REMOVE_PLAYER'; payload: { index: number } }
  | { type: 'START_GAME' }
  | { type: 'SET_DIE'; payload: { dieIndex: number } }
  | { type: 'CLEAR_DICE' }
  | { type: 'SELECT_CATEGORY'; payload: { category: Category } }
  | { type: 'END_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'NEW_GAME' }

export const initialLocalGameState: LocalGameState = {
  status: 'setup',
  players: [],
  currentPlayerIndex: 0,
  round: 1,
  dice: [0, 0, 0, 0, 0],
  scorecards: {},
  lastMoves: {},
  availableCategories: {},
  finalScores: [],
  winner: null,
}

function finishGame(state: LocalGameState): LocalGameState {
  const finalScores = state.players.map((_, i) => ({
    playerIndex: i,
    grandTotal: calculateTotals(state.scorecards[i]).grandTotal,
  }))
  const sorted = [...finalScores].sort((a, b) => b.grandTotal - a.grandTotal)
  return {
    ...state,
    status: 'finished',
    finalScores,
    winner: sorted[0].playerIndex,
  }
}

export function localGameReducer(state: LocalGameState, action: LocalGameAction): LocalGameState {
  switch (action.type) {
    case 'ADD_PLAYER': {
      if (state.players.length >= 6) return state
      return { ...state, players: [...state.players, action.payload.name] }
    }

    case 'REMOVE_PLAYER': {
      return {
        ...state,
        players: state.players.filter((_, i) => i !== action.payload.index),
      }
    }

    case 'START_GAME': {
      if (state.players.length < 2) return state
      const scorecards: Record<number, ScorecardData> = {}
      for (let i = 0; i < state.players.length; i++) {
        scorecards[i] = createEmptyScorecard()
      }
      return {
        ...state,
        status: 'playing',
        currentPlayerIndex: 0,
        round: 1,
        dice: [0, 0, 0, 0, 0],
        scorecards,
        lastMoves: {},
        availableCategories: {},
        finalScores: [],
        winner: null,
      }
    }

    case 'SET_DIE': {
      const { dieIndex } = action.payload
      const newDice = [...state.dice]
      // Cycle: 0→1→2→3→4→5→6→1
      newDice[dieIndex] = newDice[dieIndex] >= 6 ? 1 : newDice[dieIndex] + 1

      const allSet = newDice.every(d => d > 0)
      const available = allSet
        ? calculateAvailableScores(newDice, state.scorecards[state.currentPlayerIndex])
        : {}

      return { ...state, dice: newDice, availableCategories: available }
    }

    case 'CLEAR_DICE': {
      return { ...state, dice: [0, 0, 0, 0, 0], availableCategories: {} }
    }

    case 'SELECT_CATEGORY': {
      const { category } = action.payload
      const score = calculateScore(state.dice, category)
      const playerIdx = state.currentPlayerIndex

      const newScorecard = { ...state.scorecards[playerIdx], [category]: score }
      const newScorecards = { ...state.scorecards, [playerIdx]: newScorecard }
      const newLastMoves = { ...state.lastMoves, [playerIdx]: { category, score } }

      // Check if game is complete
      const allComplete = state.players.every((_, i) =>
        isScorecardComplete(i === playerIdx ? newScorecard : state.scorecards[i])
      )

      if (allComplete) {
        return finishGame({ ...state, scorecards: newScorecards, lastMoves: newLastMoves })
      }

      // Advance to next player
      const nextPlayer = (playerIdx + 1) % state.players.length
      const nextRound = nextPlayer === 0 ? state.round + 1 : state.round

      return {
        ...state,
        scorecards: newScorecards,
        lastMoves: newLastMoves,
        currentPlayerIndex: nextPlayer,
        round: nextRound,
        dice: [0, 0, 0, 0, 0],
        availableCategories: {},
      }
    }

    case 'END_GAME': {
      return finishGame(state)
    }

    case 'RESET_GAME': {
      return {
        ...initialLocalGameState,
        players: state.players,
      }
    }

    case 'NEW_GAME': {
      return initialLocalGameState
    }

    default:
      return state
  }
}
