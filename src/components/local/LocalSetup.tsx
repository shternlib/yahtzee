'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface LocalSetupProps {
  players: string[]
  onAddPlayer: (name: string) => void
  onRemovePlayer: (index: number) => void
  onStartGame: () => void
}

export function LocalSetup({ players, onAddPlayer, onRemovePlayer, onStartGame }: LocalSetupProps) {
  const t = useTranslations('local')
  const [name, setName] = useState('')

  const handleAdd = () => {
    if (name.trim() && players.length < 6) {
      onAddPlayer(name.trim())
      setName('')
    }
  }

  const canStart = players.length >= 2

  return (
    <div className="flex flex-col gap-6 px-4 py-6 min-h-dvh">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-dragon-text">{t('title')}</h1>
        <p className="text-dragon-muted text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Add player input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={t('playerPlaceholder')}
          maxLength={20}
          className="flex-1 px-4 py-3 bg-dragon-card border border-dragon-purple/30 rounded-2xl text-dragon-text placeholder-dragon-muted/50 text-lg outline-none focus:ring-2 focus:ring-dragon-orange/60 transition-shadow"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim() || players.length >= 6}
          className="px-5 py-3 bg-dragon-orange text-white rounded-2xl font-bold active:bg-dragon-orange-dark transition-colors disabled:opacity-50"
        >
          +
        </button>
      </div>

      {players.length >= 6 && (
        <p className="text-xs text-dragon-muted text-center">{t('maxPlayers')}</p>
      )}

      {/* Player list */}
      <div className="flex flex-col gap-2">
        {players.map((player, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-dragon-card/60 rounded-xl border border-dragon-purple/20"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-dragon-orange">
              {player[0].toUpperCase()}
            </div>
            <span className="flex-1 font-medium text-dragon-text">{player}</span>
            <button
              onClick={() => onRemovePlayer(index)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dragon-muted active:text-red-400 active:bg-red-400/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Start button */}
      <div className="mt-auto">
        <button
          onClick={onStartGame}
          disabled={!canStart}
          className="w-full py-4 bg-dragon-orange text-white rounded-2xl text-lg font-bold active:bg-dragon-orange-dark transition-colors disabled:opacity-50 shadow-lg shadow-dragon-orange/30"
        >
          {canStart ? t('startGame') : t('needMorePlayers')}
        </button>
      </div>
    </div>
  )
}
