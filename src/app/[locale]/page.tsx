'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { storeSessionId, storePlayerName, getStoredPlayerName } from '@/lib/utils/session'
import Image from 'next/image'

export default function HomePage() {
  const t = useTranslations('home')
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = getStoredPlayerName()
    if (stored) setName(stored)
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        storeSessionId(data.sessionId)
        storePlayerName(name.trim())
        router.push(`/game/${data.roomCode}`)
      } else {
        setError(data.error?.message || 'Failed to create room')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = () => {
    if (!joinCode.trim()) return
    storePlayerName(name.trim())
    router.push(`/game/${joinCode.trim().toUpperCase()}`)
  }

  const handlePlayWithBots = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message || 'Failed'); return }

      storeSessionId(data.sessionId)
      storePlayerName(name.trim())

      await fetch(`/api/rooms/${data.roomCode}/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId }),
      })

      await fetch(`/api/rooms/${data.roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId }),
      })

      router.push(`/game/${data.roomCode}`)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8 min-h-dvh">
      <div className="absolute safe-top right-4">
        <LanguageToggle />
      </div>

      {/* Dragon mascot + title */}
      <div className="flex flex-col items-center mt-4">
        <Image
          src="/dragon-bg.png"
          alt="Dragon mascot"
          width={140}
          height={140}
          priority
          className="drop-shadow-[0_4px_24px_rgba(246,130,35,0.4)] animate-float"
        />
        <h1 className="text-4xl font-extrabold mt-2 bg-gradient-to-r from-dragon-orange via-yellow-400 to-dragon-orange bg-clip-text text-transparent">
          {t('title')}
        </h1>
        <p className="text-dragon-muted text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          maxLength={20}
          className="w-full px-4 py-4 bg-dragon-card border border-dragon-purple/30 rounded-2xl text-dragon-text placeholder-dragon-muted/50 text-lg outline-none focus:ring-2 focus:ring-dragon-orange/60 transition-shadow"
        />

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="w-full py-4 bg-dragon-orange text-white rounded-2xl text-lg font-bold active:bg-dragon-orange-dark transition-colors disabled:opacity-50 shadow-lg shadow-dragon-orange/30"
        >
          {t('createGame')}
        </button>

        <button
          onClick={handlePlayWithBots}
          disabled={!name.trim() || loading}
          className="w-full py-3 bg-dragon-purple text-white rounded-2xl font-semibold active:bg-dragon-purple/80 transition-colors disabled:opacity-50"
        >
          {t('playWithBots')}
        </button>
      </div>

      <div className="w-full max-w-sm border-t border-dragon-purple/30 pt-5">
        <p className="text-sm text-dragon-muted mb-3 text-center">{t('joinByCode')}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t('codePlaceholder')}
            maxLength={4}
            className="flex-1 px-4 py-3 bg-dragon-card border border-dragon-purple/30 rounded-2xl text-dragon-text placeholder-dragon-muted/50 font-mono text-lg tracking-wider outline-none focus:ring-2 focus:ring-dragon-orange/60 uppercase transition-shadow"
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim()}
            className="px-6 py-3 bg-dragon-green text-white rounded-2xl font-bold active:bg-dragon-green/80 transition-colors disabled:opacity-50"
          >
            {t('join')}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <a
        href="https://dragonfamily.world"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-xs text-dragon-muted/60 hover:text-dragon-muted transition-colors"
      >
        dragonfamily.world
      </a>
    </div>
  )
}
