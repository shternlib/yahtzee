'use client'

import { useTranslations } from 'next-intl'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import type { PlayerInfo } from '@/context/gameReducer'

interface TurnIndicatorProps {
  currentPlayerIndex: number
  players: PlayerInfo[]
  round: number
  isMyTurn: boolean
  onShowRules: () => void
}

export function TurnIndicator({ currentPlayerIndex, players, round, isMyTurn, onShowRules }: TurnIndicatorProps) {
  const t = useTranslations('game')
  const currentPlayer = players.find((p) => p.playerIndex === currentPlayerIndex)

  return (
    <div className={`flex items-center py-3 px-4 rounded-2xl ${isMyTurn ? 'bg-dragon-orange/15 border border-dragon-orange/30' : 'bg-dragon-card/60'}`}>
      <div className="flex-1 text-center">
        <p className="text-xs text-dragon-muted mb-1">
          {t('round')} {round} {t('of13')}
        </p>
        <p className={`text-lg font-bold ${isMyTurn ? 'text-dragon-orange' : 'text-dragon-text'}`}>
          {isMyTurn ? t('yourTurn') : t('waitingFor', { name: currentPlayer?.displayName || '...' })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onShowRules}
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
    </div>
  )
}
