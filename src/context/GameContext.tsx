'use client'

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import { gameReducer, initialGameState, type GameState, type GameAction } from './gameReducer'

const GameContext = createContext<{
  state: GameState
  dispatch: Dispatch<GameAction>
}>({
  state: initialGameState,
  dispatch: () => {},
})

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  return useContext(GameContext)
}
