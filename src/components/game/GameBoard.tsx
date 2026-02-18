'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useGame } from '@/context/GameContext'
import { DiceScene } from '@/components/dice/DiceScene'
import { DiceControls } from '@/components/dice/DiceControls'
import { Scorecard } from '@/components/scorecard/Scorecard'
import { TurnIndicator } from './TurnIndicator'
import type { Category } from '@/lib/yahtzee/categories'

const DISCONNECT_SKIP_TIMEOUT = 30_000

interface BotTurn {
  playerIndex: number
  dice: number[]
  category: Category
  score: number
}

export function GameBoard() {
  const { state, dispatch } = useGame()
  const [rolling, setRolling] = useState(false)
  const [loading, setLoading] = useState(false)
  const [botAnimating, setBotAnimating] = useState(false)
  const [botLastAction, setBotLastAction] = useState<string | null>(null)
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t = useTranslations('game')
  const tScore = useTranslations('scorecard')

  const isMyTurn = !botAnimating && state.myPlayerIndex === state.currentTurn.playerIndex

  const categoryNames: Record<string, string> = {
    ones: tScore('ones'), twos: tScore('twos'), threes: tScore('threes'),
    fours: tScore('fours'), fives: tScore('fives'), sixes: tScore('sixes'),
    threeOfAKind: tScore('threeOfAKind'), fourOfAKind: tScore('fourOfAKind'),
    fullHouse: tScore('fullHouse'), smallStraight: tScore('smallStraight'),
    largeStraight: tScore('largeStraight'), yahtzee: tScore('yahtzee'), chance: tScore('chance'),
  }

  // Animate bot turns sequentially
  const animateBotTurns = useCallback(async (
    botTurns: BotTurn[],
    finalNextPlayer: number,
    finalRound: number,
    gameFinished: boolean,
    gameEndData?: { scores: { playerIndex: number; grandTotal: number }[]; winner: number }
  ) => {
    setBotAnimating(true)
    setBotLastAction(null)

    for (let i = 0; i < botTurns.length; i++) {
      const bt = botTurns[i]
      const botName = state.players.find(p => p.playerIndex === bt.playerIndex)?.displayName || 'Bot'

      // Show bot thinking
      setBotLastAction(null)
      await sleep(400)

      // Show bot rolling dice
      setRolling(true)
      dispatch({
        type: 'DICE_ROLLED',
        payload: { dice: bt.dice, rollCount: 1, availableCategories: {} },
      })
      await sleep(800)
      setRolling(false)

      // Pause to show dice result
      await sleep(600)

      // Bot selects category — show what was chosen
      const catName = categoryNames[bt.category] || bt.category
      setBotLastAction(t('botChose', { name: botName, category: catName, score: String(bt.score) }))

      const nextIdx = i < botTurns.length - 1
        ? botTurns[i + 1].playerIndex
        : finalNextPlayer
      const isLast = i === botTurns.length - 1

      dispatch({
        type: 'SCORE_SELECTED',
        payload: {
          playerIndex: bt.playerIndex,
          category: bt.category,
          score: bt.score,
          nextPlayerIndex: nextIdx,
          round: isLast ? finalRound : state.round,
          gameFinished: isLast && gameFinished,
        },
      })

      await sleep(1000)
    }

    if (gameFinished && gameEndData) {
      dispatch({ type: 'GAME_END', payload: gameEndData })
    }

    setBotLastAction(null)
    setBotAnimating(false)
  }, [dispatch, state.round, state.players, categoryNames, t])

  // Auto-skip disconnected player's turn after 30s
  useEffect(() => {
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current)
      skipTimerRef.current = null
    }

    const currentPlayer = state.players.find(p => p.playerIndex === state.currentTurn.playerIndex)
    if (!currentPlayer || currentPlayer.isBot || currentPlayer.isConnected) return
    if (state.status !== 'playing') return

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
        // Retry on next render
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
        const nextPlayer = data.nextPlayerIndex ?? state.currentTurn.playerIndex
        const nextRound = data.round ?? state.round
        const hasBotTurns = data.botTurns && data.botTurns.length > 0

        // Dispatch human score — if bots follow, point to first bot
        dispatch({
          type: 'SCORE_SELECTED',
          payload: {
            playerIndex: state.currentTurn.playerIndex,
            category,
            score: data.score,
            nextPlayerIndex: hasBotTurns ? data.botTurns[0].playerIndex : nextPlayer,
            round: hasBotTurns ? state.round : nextRound,
            gameFinished: !hasBotTurns && (data.gameFinished ?? false),
          },
        })

        if (hasBotTurns) {
          // Animate bot turns visually
          animateBotTurns(
            data.botTurns,
            nextPlayer,
            nextRound,
            data.gameFinished ?? false,
            data.gameFinished ? { scores: data.scores, winner: data.winner } : undefined
          )
        } else if (data.gameFinished) {
          dispatch({ type: 'GAME_END', payload: { scores: data.scores, winner: data.winner } })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [isMyTurn, loading, state.roomCode, state.mySessionId, state.currentTurn, state.round, dispatch, animateBotTurns])

  const handleToggleHold = useCallback((index: number) => {
    if (!isMyTurn || state.currentTurn.rollCount === 0) return
    dispatch({ type: 'TOGGLE_HOLD', payload: { dieIndex: index } })
  }, [isMyTurn, state.currentTurn.rollCount, dispatch])

  // Get current bot info for display
  const currentPlayer = state.players.find(p => p.playerIndex === state.currentTurn.playerIndex)
  const isBotTurn = botAnimating && currentPlayer?.isBot

  return (
    <div className="flex flex-col gap-3 min-h-screen pb-4">
      <TurnIndicator
        currentPlayerIndex={state.currentTurn.playerIndex}
        players={state.players}
        round={state.round}
        isMyTurn={isMyTurn}
      />

      {isBotTurn && (
        <div className="text-center px-4">
          <p className="text-sm text-purple-400 animate-pulse">
            {t('botThinking', { name: currentPlayer?.displayName || 'Bot' })}
          </p>
        </div>
      )}

      <DiceScene
        dice={state.currentTurn.dice}
        held={state.currentTurn.held}
        onToggleHold={handleToggleHold}
        rolling={rolling}
        disabled={!isMyTurn || state.currentTurn.rollCount === 0}
      />

      {!botAnimating && (
        <DiceControls
          rollCount={state.currentTurn.rollCount}
          onRoll={handleRoll}
          disabled={loading}
          isMyTurn={isMyTurn}
        />
      )}

      {botAnimating && botLastAction && (
        <div className="text-center px-4 py-3">
          <p className="text-purple-300 font-semibold">
            {botLastAction}
          </p>
        </div>
      )}

      {state.players.length > 0 && (
        <div className="px-4 mt-2">
          <Scorecard
            players={state.players}
            scorecards={state.scorecards}
            currentTurnIndex={state.currentTurn.playerIndex}
            myPlayerIndex={state.myPlayerIndex}
            availableCategories={isMyTurn && state.currentTurn.rollCount > 0 ? state.availableCategories : {}}
            onSelectCategory={handleSelectCategory}
            isInteractive={isMyTurn && state.currentTurn.rollCount > 0}
          />
        </div>
      )}
    </div>
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
