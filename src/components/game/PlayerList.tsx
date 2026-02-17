'use client'

import type { PlayerInfo } from '@/context/gameReducer'
import type { ScorecardData } from '@/lib/yahtzee/categories'
import { calculateTotals } from '@/lib/yahtzee/scoring'

interface PlayerListProps {
  players: PlayerInfo[]
  currentTurnIndex: number
  myIndex: number | null
  scorecards: Record<number, ScorecardData>
}

export function PlayerList({ players, currentTurnIndex, myIndex, scorecards }: PlayerListProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
      {players.map((player) => {
        const scorecard = scorecards[player.playerIndex]
        const total = scorecard ? calculateTotals(scorecard).grandTotal : 0
        const isActive = player.playerIndex === currentTurnIndex
        const isMe = player.playerIndex === myIndex

        return (
          <div
            key={player.playerIndex}
            className={`
              flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl
              ${isActive ? 'bg-blue-600/20 border border-blue-500/40' : ''}
              ${!player.isConnected ? 'opacity-50' : ''}
            `}
          >
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                ${isMe ? 'bg-blue-600 text-white' : player.isBot ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-200'}
              `}
            >
              {player.displayName[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-300 truncate max-w-[60px]">{player.displayName}</span>
            <span className="text-xs font-mono text-gray-400">{total}</span>
          </div>
        )
      })}
    </div>
  )
}
