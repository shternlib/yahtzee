'use client'

import { useTranslations } from 'next-intl'
import type { PlayerInfo } from '@/context/gameReducer'

interface TurnIndicatorProps {
  currentPlayerIndex: number
  players: PlayerInfo[]
  round: number
  isMyTurn: boolean
}

export function TurnIndicator({ currentPlayerIndex, players, round, isMyTurn }: TurnIndicatorProps) {
  const t = useTranslations('game')
  const currentPlayer = players.find((p) => p.playerIndex === currentPlayerIndex)

  return (
    <div className={`text-center py-3 px-4 rounded-2xl ${isMyTurn ? 'bg-dragon-orange/15 border border-dragon-orange/30' : 'bg-dragon-card/60'}`}>
      <p className="text-xs text-dragon-muted mb-1">
        {t('round')} {round} {t('of13')}
      </p>
      <p className={`text-lg font-bold ${isMyTurn ? 'text-dragon-orange' : 'text-dragon-text'}`}>
        {isMyTurn ? t('yourTurn') : t('waitingFor', { name: currentPlayer?.displayName || '...' })}
      </p>
    </div>
  )
}
