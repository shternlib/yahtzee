'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { storeSessionId, storePlayerName } from '@/lib/utils/session'

export default function HomePage() {
  const t = useTranslations('home')
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      // Create room
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message || 'Failed'); return }

      storeSessionId(data.sessionId)
      storePlayerName(name.trim())

      // Add a bot
      await fetch(`/api/rooms/${data.roomCode}/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId }),
      })

      // Start game
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
    <div className="flex flex-col items-center gap-8 px-6 py-12 min-h-dvh">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="text-center mt-8">
        <h1 className="text-5xl font-bold mb-2">{t('title')}</h1>
        <p className="text-gray-400">{t('subtitle')}</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          maxLength={20}
          className="w-full px-4 py-4 bg-gray-800 rounded-xl text-white placeholder-gray-500 text-lg outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold active:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {t('createGame')}
        </button>

        <button
          onClick={handlePlayWithBots}
          disabled={!name.trim() || loading}
          className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold active:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {t('playWithBots')}
        </button>
      </div>

      <div className="w-full max-w-sm border-t border-gray-700 pt-6">
        <p className="text-sm text-gray-400 mb-3 text-center">{t('joinByCode')}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t('codePlaceholder')}
            maxLength={6}
            className="flex-1 px-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 font-mono text-lg tracking-wider outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold active:bg-green-700 transition-colors disabled:opacity-50"
          >
            {t('join')}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
