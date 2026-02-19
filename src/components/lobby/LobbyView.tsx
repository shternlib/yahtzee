'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useGame } from '@/context/GameContext'
import { useRouter } from '@/i18n/routing'
import { ShareLink } from './ShareLink'

const POLL_INTERVAL = 3000

export function LobbyView() {
  const t = useTranslations('lobby')
  const { state, dispatch } = useGame()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for lobby updates (new players joining/leaving)
  useEffect(() => {
    if (!state.roomCode) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/rooms/${state.roomCode}`)
        if (!res.ok) return
        const data = await res.json()

        // Sync player list
        for (const p of data.players) {
          if (!state.players.some(ep => ep.playerIndex === p.playerIndex)) {
            dispatch({
              type: 'PLAYER_JOINED',
              payload: {
                id: p.id,
                displayName: p.displayName,
                playerIndex: p.playerIndex,
                isBot: p.isBot,
                isConnected: true,
              },
            })
          }
        }
        // Remove players who left
        for (const ep of state.players) {
          if (!data.players.some((p: { playerIndex: number }) => p.playerIndex === ep.playerIndex)) {
            dispatch({ type: 'PLAYER_LEFT', payload: { playerIndex: ep.playerIndex } })
          }
        }

        // If game started (host pressed start on another device or via broadcast)
        if (data.status === 'playing') {
          const turnOrder = data.players.map((p: { playerIndex: number }) => p.playerIndex)
          dispatch({ type: 'GAME_START', payload: { turnOrder, firstPlayer: data.currentTurnPlayerIndex ?? 0 } })
        }
      } catch {
        // Ignore network errors during polling
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [state.roomCode, state.players, dispatch])

  const isHost = state.mySessionId === state.hostSessionId
  const canStart = state.players.length >= 2
  const canAddBot = state.players.length < 4

  const handleAddBot = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${state.roomCode}/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.mySessionId }),
      })
      const data = await res.json()
      if (res.ok) {
        dispatch({
          type: 'PLAYER_JOINED',
          payload: {
            id: data.playerId,
            displayName: data.displayName,
            playerIndex: data.playerIndex,
            isBot: true,
            isConnected: true,
          },
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${state.roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.mySessionId }),
      })
      const data = await res.json()
      if (res.ok) {
        dispatch({
          type: 'GAME_START',
          payload: { turnOrder: data.turnOrder, firstPlayer: data.firstPlayer },
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    setLoading(true)
    try {
      await fetch(`/api/rooms/${state.roomCode}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.mySessionId }),
      })
      router.push('/')
    } catch {
      router.push('/')
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 min-h-screen">
      <h1 className="text-2xl font-bold text-center text-dragon-text">{t('title')}</h1>

      <ShareLink roomCode={state.roomCode} />

      <div className="flex flex-col gap-3">
        <p className="text-sm text-dragon-muted">
          {t('players')} ({state.players.length} {t('of')} 4)
        </p>
        {state.players.map((player) => (
          <div
            key={player.playerIndex}
            className="flex items-center gap-3 p-3 bg-dragon-card/60 rounded-xl border border-dragon-purple/20"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
              player.isBot ? 'bg-dragon-purple' : 'bg-dragon-orange'
            }`}>
              {player.displayName[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-dragon-text">{player.displayName}</p>
              <p className="text-xs text-dragon-muted">
                {player.playerIndex === 0 && t('host')}
                {player.isBot && t('bot')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isHost && (
        <div className="flex flex-col gap-3 mt-auto">
          {canAddBot && (
            <button
              onClick={handleAddBot}
              disabled={loading}
              className="w-full py-3 bg-dragon-purple text-white rounded-xl font-semibold active:bg-dragon-purple/80 transition-colors disabled:opacity-50"
            >
              {t('addBot')}
            </button>
          )}
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="w-full py-4 bg-dragon-orange text-white rounded-xl text-lg font-bold active:bg-dragon-orange-dark transition-colors disabled:opacity-50 shadow-lg shadow-dragon-orange/30"
          >
            {canStart ? t('startGame') : t('needMorePlayers')}
          </button>
        </div>
      )}

      {!isHost && (
        <p className="text-center text-dragon-muted mt-auto py-4">
          {t('waitingForPlayers')}
        </p>
      )}

      <button
        onClick={handleLeave}
        disabled={loading}
        className="w-full py-3 text-dragon-muted rounded-xl font-medium active:text-dragon-text transition-colors disabled:opacity-50"
      >
        {t('leave')}
      </button>
    </div>
  )
}
