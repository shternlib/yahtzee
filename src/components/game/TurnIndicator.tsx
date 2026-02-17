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
    <div className={`text-center py-3 px-4 rounded-xl ${isMyTurn ? 'bg-green-900/30 border border-green-500/30' : 'bg-gray-800/50'}`}>
      <p className="text-xs text-gray-400 mb-1">
        {t('round')} {round} {t('of13')}
      </p>
      <p className={`text-lg font-bold ${isMyTurn ? 'text-green-400' : 'text-white'}`}>
        {isMyTurn ? t('yourTurn') : t('waitingFor', { name: currentPlayer?.displayName || '...' })}
      </p>
    </div>
  )
}
