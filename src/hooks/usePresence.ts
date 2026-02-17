'use client'

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useGame } from '@/context/GameContext'

export function usePresence(roomCode: string | null, sessionId: string | null) {
  const { state, dispatch } = useGame()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!roomCode || !sessionId) return

    const channel = supabase.channel(`presence:${roomCode}`, {
      config: { presence: { key: sessionId } },
    })
    channelRef.current = channel

    const myPlayer = state.players.find((p) => p.sessionId === sessionId)

    channel
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        for (const presence of newPresences) {
          if (typeof presence.playerIndex === 'number') {
            dispatch({
              type: 'PLAYER_CONNECTED',
              payload: { playerIndex: presence.playerIndex },
            })
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const presence of leftPresences) {
          if (typeof presence.playerIndex === 'number') {
            dispatch({
              type: 'PLAYER_DISCONNECTED',
              payload: { playerIndex: presence.playerIndex },
            })
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && myPlayer) {
          await channel.track({
            displayName: myPlayer.displayName,
            playerIndex: myPlayer.playerIndex,
            lastSeen: Date.now(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [roomCode, sessionId, state.players, dispatch])

  return channelRef
}
