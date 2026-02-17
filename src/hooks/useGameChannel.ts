'use client'

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createGameChannel } from '@/lib/supabase/realtime'
import { useGame } from '@/context/GameContext'

export function useGameChannel(roomCode: string | null) {
  const { dispatch } = useGame()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!roomCode) return

    const channel = createGameChannel(roomCode)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'dice_roll' }, ({ payload }) => {
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
        dispatch({
          type: 'GAME_START',
          payload: { turnOrder: payload.turnOrder, firstPlayer: payload.firstPlayer },
        })
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        dispatch({
          type: 'GAME_END',
          payload: { scores: payload.scores, winner: payload.winner },
        })
      })
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        dispatch({ type: 'PLAYER_JOINED', payload: payload.player })
      })
      .on('broadcast', { event: 'player_left' }, ({ payload }) => {
        dispatch({ type: 'PLAYER_LEFT', payload: { playerIndex: payload.playerIndex } })
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [roomCode, dispatch])

  return channelRef
}
