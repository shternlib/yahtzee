'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGame } from '@/context/GameContext'
import { useRouter } from '@/i18n/routing'
import { ShareLink } from './ShareLink'

export function LobbyView() {
  const t = useTranslations('lobby')
  const { state, dispatch } = useGame()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
      <h1 className="text-2xl font-bold text-center">{t('title')}</h1>

      <ShareLink roomCode={state.roomCode} />

      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-400">
          {t('players')} ({state.players.length} {t('of')} 4)
        </p>
        {state.players.map((player) => (
          <div
            key={player.playerIndex}
            className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              player.isBot ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {player.displayName[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium">{player.displayName}</p>
              <p className="text-xs text-gray-400">
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
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold active:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {t('addBot')}
            </button>
          )}
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="w-full py-4 bg-green-600 text-white rounded-xl text-lg font-bold active:bg-green-700 transition-colors disabled:opacity-50"
          >
            {canStart ? t('startGame') : t('needMorePlayers')}
          </button>
        </div>
      )}

      {!isHost && (
        <p className="text-center text-gray-400 mt-auto py-4">
          {t('waitingForPlayers')}
        </p>
      )}

      <button
        onClick={handleLeave}
        disabled={loading}
        className="w-full py-3 text-gray-400 rounded-xl font-medium active:text-white transition-colors disabled:opacity-50"
      >
        {t('leave')}
      </button>
    </div>
  )
}
