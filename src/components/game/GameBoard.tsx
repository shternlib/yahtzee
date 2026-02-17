'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useGame } from '@/context/GameContext'
import { DiceScene } from '@/components/dice/DiceScene'
import { DiceControls } from '@/components/dice/DiceControls'
import { Scorecard } from '@/components/scorecard/Scorecard'
import { TurnIndicator } from './TurnIndicator'
import { PlayerList } from './PlayerList'
import type { Category } from '@/lib/yahtzee/categories'

const DISCONNECT_SKIP_TIMEOUT = 30_000 // 30 seconds

export function GameBoard() {
  const { state, dispatch } = useGame()
  const [rolling, setRolling] = useState(false)
  const [loading, setLoading] = useState(false)
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isMyTurn = state.myPlayerIndex === state.currentTurn.playerIndex
  const myScorecard = state.myPlayerIndex !== null ? state.scorecards[state.myPlayerIndex] : null

  // Auto-skip disconnected player's turn after 30s
  useEffect(() => {
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current)
      skipTimerRef.current = null
    }

    const currentPlayer = state.players.find(p => p.playerIndex === state.currentTurn.playerIndex)
    if (!currentPlayer || currentPlayer.isBot || currentPlayer.isConnected) return
    if (state.status !== 'playing') return

    // Only the host initiates the skip to avoid duplicates
    const isHost = state.mySessionId === state.hostSessionId
    if (!isHost) return

    skipTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/rooms/${state.roomCode}/skip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: state.mySessionId }),
        })
        const data = await res.json()
        if (res.ok) {
          dispatch({
            type: 'SCORE_SELECTED',
            payload: {
              playerIndex: state.currentTurn.playerIndex,
              category: data.category,
              score: 0,
              nextPlayerIndex: data.nextPlayerIndex ?? state.currentTurn.playerIndex,
              round: data.round ?? state.round,
              gameFinished: data.gameFinished ?? false,
            },
          })
          if (data.gameFinished) {
            dispatch({ type: 'GAME_END', payload: { scores: data.scores, winner: data.winner } })
          }
        }
      } catch {
        // Ignore errors, will retry on next render
      }
    }, DISCONNECT_SKIP_TIMEOUT)

    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current)
        skipTimerRef.current = null
      }
    }
  }, [state.currentTurn.playerIndex, state.players, state.status, state.roomCode, state.mySessionId, state.hostSessionId, state.round, state.currentTurn, dispatch])

  const handleRoll = useCallback(async () => {
    if (!isMyTurn || loading) return
    setRolling(true)
    setLoading(true)

    try {
      const res = await fetch(`/api/rooms/${state.roomCode}/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          held: state.currentTurn.held,
          sessionId: state.mySessionId,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        dispatch({
          type: 'DICE_ROLLED',
          payload: {
            dice: data.dice,
            rollCount: data.rollCount,
            availableCategories: data.availableCategories || {},
          },
        })
      }
    } finally {
      setTimeout(() => setRolling(false), 300)
      setLoading(false)
    }
  }, [isMyTurn, loading, state.roomCode, state.currentTurn.held, state.mySessionId, dispatch])

  const handleSelectCategory = useCallback(async (category: Category) => {
    if (!isMyTurn || loading || state.currentTurn.rollCount === 0) return
    setLoading(true)

    try {
      const res = await fetch(`/api/rooms/${state.roomCode}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          sessionId: state.mySessionId,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        dispatch({
          type: 'SCORE_SELECTED',
          payload: {
            playerIndex: state.currentTurn.playerIndex,
            category,
            score: data.score,
            nextPlayerIndex: data.nextPlayerIndex ?? state.currentTurn.playerIndex,
            round: data.round ?? state.round,
            gameFinished: data.gameFinished ?? false,
          },
        })

        if (data.gameFinished) {
          dispatch({
            type: 'GAME_END',
            payload: { scores: data.scores, winner: data.winner },
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [isMyTurn, loading, state.roomCode, state.mySessionId, state.currentTurn, state.round, dispatch])

  const handleToggleHold = useCallback((index: number) => {
    if (!isMyTurn || state.currentTurn.rollCount === 0) return
    dispatch({ type: 'TOGGLE_HOLD', payload: { dieIndex: index } })
  }, [isMyTurn, state.currentTurn.rollCount, dispatch])

  return (
    <div className="flex flex-col gap-3 min-h-screen pb-4">
      <PlayerList
        players={state.players}
        currentTurnIndex={state.currentTurn.playerIndex}
        myIndex={state.myPlayerIndex}
        scorecards={state.scorecards}
      />

      <TurnIndicator
        currentPlayerIndex={state.currentTurn.playerIndex}
        players={state.players}
        round={state.round}
        isMyTurn={isMyTurn}
      />

      <DiceScene
        dice={state.currentTurn.dice}
        held={state.currentTurn.held}
        onToggleHold={handleToggleHold}
        rolling={rolling}
        disabled={!isMyTurn || state.currentTurn.rollCount === 0}
      />

      <DiceControls
        rollCount={state.currentTurn.rollCount}
        onRoll={handleRoll}
        disabled={loading}
        isMyTurn={isMyTurn}
      />

      {myScorecard && (
        <div className="px-4 mt-2">
          <Scorecard
            scorecard={myScorecard}
            availableCategories={isMyTurn && state.currentTurn.rollCount > 0 ? state.availableCategories : {}}
            onSelectCategory={handleSelectCategory}
            isInteractive={isMyTurn && state.currentTurn.rollCount > 0}
          />
        </div>
      )}
    </div>
  )
}
