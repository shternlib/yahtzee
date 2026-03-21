'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createGameChannel } from '@/lib/supabase/realtime'
import { useGame } from '@/context/GameContext'

const SYNC_INTERVAL_MS = 30_000

export function useGameChannel(roomCode: string | null) {
  const { state, dispatch } = useGame()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSyncingRef = useRef(false)

  // Use refs for values needed in callbacks to avoid re-subscribing on every state change
  const stateRef = useRef(state)
  stateRef.current = state

  const syncWithServer = useCallback(async () => {
    const currentState = stateRef.current
    if (!currentState.roomCode || !currentState.mySessionId) return
    if (isSyncingRef.current) return

    isSyncingRef.current = true
    try {
      const res = await fetch(
        `/api/rooms/${currentState.roomCode}/state?sessionId=${encodeURIComponent(currentState.mySessionId)}`
      )
      if (!res.ok) return

      const data = await res.json()

      // Check if there is a meaningful mismatch between local and server state
      const hasMismatch =
        data.currentTurnPlayerIndex !== currentState.currentTurn.playerIndex ||
        data.currentRound !== currentState.round ||
        data.status !== currentState.status ||
        (data.players?.length ?? 0) !== currentState.players.length

      if (hasMismatch) {
        dispatch({
          type: 'SYNC_STATE',
          payload: {
            status: data.status,
            currentTurnPlayerIndex: data.currentTurnPlayerIndex,
            round: data.currentRound,
            players: data.players,
            gameState: data.gameState,
          },
        })
      }
    } catch {
      // Sync failures are non-fatal; we'll retry on next interval
    } finally {
      isSyncingRef.current = false
    }
  }, [dispatch])

  useEffect(() => {
    if (!roomCode) return

    const channel = createGameChannel(roomCode)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'dice_roll' }, ({ payload }) => {
        const currentState = stateRef.current
        // Validate: playerIndex should match current turn
        if (
          payload.playerIndex !== undefined &&
          payload.playerIndex !== currentState.currentTurn.playerIndex
        ) {
          // Suspicious event — sync with server instead
          syncWithServer()
          return
        }
        dispatch({
          type: 'DICE_ROLLED',
          payload: {
            dice: payload.dice,
            rollCount: payload.rollCount,
            availableCategories: payload.availableCategories || {},
          },
        })
      })
      .on('broadcast', { event: 'score_update' }, ({ payload }) => {
        const currentState = stateRef.current
        // Validate: playerIndex should match current turn
        if (payload.playerIndex !== currentState.currentTurn.playerIndex) {
          syncWithServer()
          return
        }
        dispatch({
          type: 'SCORE_SELECTED',
          payload: {
            playerIndex: payload.playerIndex,
            category: payload.category,
            score: payload.score,
            nextPlayerIndex: payload.nextPlayerIndex,
            round: payload.round,
            gameFinished: payload.gameFinished,
          },
        })
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        const currentState = stateRef.current
        // Validate: game should be in lobby status
        if (currentState.status !== 'lobby') {
          syncWithServer()
          return
        }
        dispatch({
          type: 'GAME_START',
          payload: { turnOrder: payload.turnOrder, firstPlayer: payload.firstPlayer },
        })
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        const currentState = stateRef.current
        if (currentState.status !== 'playing') {
          syncWithServer()
          return
        }
        dispatch({
          type: 'GAME_END',
          payload: { scores: payload.scores, winner: payload.winner },
        })
      })
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        const currentState = stateRef.current
        if (currentState.status !== 'lobby') {
          syncWithServer()
          return
        }
        dispatch({ type: 'PLAYER_JOINED', payload: payload.player })
      })
      .on('broadcast', { event: 'player_left' }, ({ payload }) => {
        const currentState = stateRef.current
        if (currentState.status !== 'lobby') {
          syncWithServer()
          return
        }
        dispatch({ type: 'PLAYER_LEFT', payload: { playerIndex: payload.playerIndex } })
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [roomCode, dispatch, syncWithServer])

  // Periodic heartbeat sync while game is playing
  useEffect(() => {
    if (state.status === 'playing' && roomCode) {
      syncTimerRef.current = setInterval(syncWithServer, SYNC_INTERVAL_MS)
    } else {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
        syncTimerRef.current = null
      }
    }

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
        syncTimerRef.current = null
      }
    }
  }, [state.status, roomCode, syncWithServer])

  return channelRef
}
