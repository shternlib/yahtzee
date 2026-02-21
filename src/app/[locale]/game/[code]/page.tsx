'use client'

import { useEffect, useState, use } from 'react'
import { useTranslations } from 'next-intl'
import { useGame } from '@/context/GameContext'
import { useGameChannel } from '@/hooks/useGameChannel'
import { usePresence } from '@/hooks/usePresence'
import { LobbyView } from '@/components/lobby/LobbyView'
import { GameBoard } from '@/components/game/GameBoard'
import { ResultsView } from '@/components/results/ResultsView'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { RulesModal } from '@/components/game/RulesModal'
import { getStoredSessionId, getStoredPlayerName, storeSessionId } from '@/lib/utils/session'

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { state, dispatch } = useGame()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const t = useTranslations('errors')

  const roomCode = code.toUpperCase()

  // Connect to realtime channel
  useGameChannel(state.roomCode || null)
  usePresence(state.roomCode || null, state.mySessionId)

  // Load room state on mount
  useEffect(() => {
    let cancelled = false

    async function loadRoom() {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`)
        const data = await res.json()

        if (cancelled) return

        if (!res.ok) {
          setError(data.error?.message || t('roomNotFound'))
          setLoading(false)
          return
        }

        const sessionId = getStoredSessionId()
        const existingPlayer = data.players.find(
          (p: { sessionId: string }) => p.sessionId === sessionId
        )

        dispatch({
          type: 'SET_ROOM',
          payload: {
            roomCode: data.roomCode,
            roomId: data.roomId,
            hostSessionId: data.hostSessionId,
            players: data.players,
            status: data.status,
          },
        })

        if (existingPlayer) {
          dispatch({
            type: 'SET_MY_SESSION',
            payload: {
              sessionId: sessionId!,
              playerIndex: existingPlayer.playerIndex,
            },
          })
          setLoading(false)
        } else if (data.status === 'lobby') {
          // Need to join
          setJoining(true)
          setLoading(false)
        } else {
          setError(t('gameStarted'))
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('Network error')
          setLoading(false)
        }
      }
    }

    loadRoom()
    return () => { cancelled = true }
  }, [roomCode, dispatch, t])

  // Join handler
  const handleJoin = async (name: string) => {
    setJoining(false)
    setLoading(true)

    try {
      const res = await fetch(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: name,
          sessionId: getStoredSessionId(),
        }),
      })
      const data = await res.json()

      if (res.ok) {
        storeSessionId(data.sessionId)
        dispatch({
          type: 'SET_MY_SESSION',
          payload: {
            sessionId: data.sessionId,
            playerIndex: data.playerIndex,
          },
        })
        // Update players list
        dispatch({
          type: 'SET_ROOM',
          payload: {
            roomCode,
            roomId: data.roomId,
            hostSessionId: state.hostSessionId || '',
            players: data.players.map((p: { displayName: string; playerIndex: number; isBot: boolean }) => ({
              id: '',
              displayName: p.displayName,
              playerIndex: p.playerIndex,
              isBot: p.isBot,
              isConnected: true,
            })),
            status: 'lobby',
          },
        })
      } else {
        setError(data.error?.message || 'Failed to join')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="animate-spin w-8 h-8 border-2 border-dragon-orange border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-dvh px-6">
        <p className="text-red-400 text-lg">{error}</p>
        <a href="/" className="text-dragon-orange underline">Back to Home</a>
      </div>
    )
  }

  if (joining) {
    return <JoinForm onJoin={handleJoin} />
  }

  const isPlaying = state.status === 'playing'

  return (
    <div className={`relative ${isPlaying ? 'pt-2' : 'pt-16'}`}>
      {!isPlaying && (
        <div className="fixed safe-top right-3 z-10 flex items-center gap-2">
          <button
            onClick={() => setShowRules(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-dragon-card border border-dragon-purple/30 text-dragon-muted active:bg-dragon-card-light transition-colors"
            aria-label="Rules"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <LanguageToggle />
        </div>
      )}
      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
      {state.status === 'lobby' && <LobbyView />}
      {isPlaying && <GameBoard onShowRules={() => setShowRules(true)} />}
      {state.status === 'finished' && <ResultsView />}
    </div>
  )
}

function JoinForm({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState(getStoredPlayerName() || '')
  const t = useTranslations('home')

  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-dvh px-6">
      <h1 className="text-3xl font-bold">{t('join')}</h1>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('namePlaceholder')}
        maxLength={20}
        className="w-full max-w-sm px-4 py-4 bg-dragon-card rounded-xl text-dragon-text placeholder-dragon-muted/50 text-lg outline-none focus:ring-2 focus:ring-dragon-orange border border-dragon-purple/30"
        autoFocus
      />
      <button
        onClick={() => name.trim() && onJoin(name.trim())}
        disabled={!name.trim()}
        className="w-full max-w-sm py-4 bg-dragon-orange text-white rounded-xl text-lg font-bold active:bg-dragon-orange-dark transition-colors disabled:opacity-50 shadow-lg shadow-dragon-orange/30"
      >
        {t('join')}
      </button>
    </div>
  )
}
