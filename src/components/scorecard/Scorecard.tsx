'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { Category, ScorecardData } from '@/lib/yahtzee/categories'
import { UPPER_CATEGORIES, LOWER_CATEGORIES } from '@/lib/yahtzee/categories'
import { calculateTotals } from '@/lib/yahtzee/scoring'
import type { PlayerInfo, LastMove } from '@/context/gameReducer'

interface ScorecardProps {
  players: PlayerInfo[]
  scorecards: Record<number, ScorecardData>
  lastMoves: Record<number, LastMove>
  currentTurnIndex: number
  myPlayerIndex: number | null
  availableCategories: Partial<Record<Category, number>>
  onSelectCategory?: (category: Category) => void
  isInteractive: boolean
}

export function Scorecard({
  players,
  scorecards,
  lastMoves,
  currentTurnIndex,
  myPlayerIndex,
  availableCategories,
  onSelectCategory,
  isInteractive,
}: ScorecardProps) {
  const t = useTranslations('scorecard')
  const [viewingIndex, setViewingIndex] = useState(currentTurnIndex)

  // Auto-switch to current turn player when turn changes
  useEffect(() => {
    setViewingIndex(currentTurnIndex)
  }, [currentTurnIndex])

  const sortedPlayers = [...players].sort((a, b) => a.playerIndex - b.playerIndex)
  const viewedScorecard = scorecards[viewingIndex] || ({} as ScorecardData)
  const viewedTotals = calculateTotals(viewedScorecard)
  const isViewingMe = viewingIndex === myPlayerIndex
  const isViewingCurrentTurn = viewingIndex === currentTurnIndex
  const canInteract = isViewingMe && isInteractive
  const viewedLastMove = lastMoves[viewingIndex]

  function renderRow(cat: Category) {
    const score = viewedScorecard[cat] ?? null
    const available = canInteract ? availableCategories[cat] : undefined
    const canSelect = canInteract && score === null && available !== undefined
    const isLastMove = viewedLastMove?.category === cat

    return (
      <button
        key={cat}
        onClick={canSelect ? () => onSelectCategory?.(cat) : undefined}
        disabled={!canSelect}
        className={`
          flex items-center justify-between w-full px-4 py-3 min-h-[48px] rounded-xl text-sm
          transition-all duration-150
          ${canSelect
            ? 'bg-blue-900/30 border border-blue-500/40 active:bg-blue-800/50'
            : isLastMove
              ? 'bg-yellow-900/20 border border-yellow-500/30'
              : score !== null
                ? 'bg-gray-800/40'
                : 'bg-gray-800/20'
          }
        `}
      >
        <span className={
          isLastMove ? 'text-yellow-300' : score !== null ? 'text-gray-300' : canSelect ? 'text-blue-300' : 'text-gray-500'
        }>
          {t(cat)}
        </span>
        <span className={`font-mono text-base font-bold ${
          canSelect ? 'text-green-400 text-lg' : isLastMove ? 'text-yellow-300' : score !== null ? 'text-white' : 'text-gray-600'
        }`}>
          {canSelect ? available : score !== null ? score : '\u2014'}
        </span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Player tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {sortedPlayers.map((player) => {
          const total = calculateTotals(scorecards[player.playerIndex] || {} as ScorecardData).grandTotal
          const isTurn = player.playerIndex === currentTurnIndex
          const isSelected = player.playerIndex === viewingIndex
          const isMe = player.playerIndex === myPlayerIndex

          const lastMove = lastMoves[player.playerIndex]

          return (
            <button
              key={player.playerIndex}
              onClick={() => setViewingIndex(player.playerIndex)}
              className={`
                flex flex-col items-center gap-0.5 min-w-[72px] px-3 py-2 rounded-xl transition-all
                ${isSelected ? 'bg-gray-700/80 scale-105' : 'bg-gray-800/40 active:bg-gray-700/50'}
                ${isTurn && !isSelected ? 'ring-2 ring-blue-500/60' : ''}
              `}
            >
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
                ${isMe ? 'bg-blue-600 text-white' : player.isBot ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-200'}
                ${isTurn ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900' : ''}
              `}>
                {player.displayName[0].toUpperCase()}
              </div>
              <span className={`text-[11px] truncate max-w-[68px] ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                {player.displayName}
              </span>
              <span className={`text-xs font-mono font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                {total}
              </span>
              {lastMove && (
                <span className="text-[10px] text-yellow-400/80 truncate max-w-[68px]">
                  {t(lastMove.category)} +{lastMove.score}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Viewed player label */}
      {!isViewingMe && (
        <div className="text-center">
          <span className={`text-xs px-3 py-1 rounded-full ${
            isViewingCurrentTurn ? 'bg-blue-900/40 text-blue-300' : 'bg-gray-800 text-gray-400'
          }`}>
            {sortedPlayers.find(p => p.playerIndex === viewingIndex)?.displayName}
          </span>
        </div>
      )}

      {/* Scorecard */}
      <div className="flex flex-col gap-1 p-3 bg-gray-800/50 rounded-2xl">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
          {t('upperSection')}
        </h3>
        {UPPER_CATEGORIES.map(renderRow)}
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400 border-t border-gray-700 mt-1">
          <span>{t('upperBonus')}</span>
          <span className="font-mono">
            {viewedTotals.upperBonus > 0 ? `+${viewedTotals.upperBonus}` : `${viewedTotals.upperTotal}/63`}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-300 border-b border-gray-700 mb-2">
          <span>{t('upperTotal')}</span>
          <span className="font-mono">{viewedTotals.upperTotal + viewedTotals.upperBonus}</span>
        </div>

        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
          {t('lowerSection')}
        </h3>
        {LOWER_CATEGORIES.map(renderRow)}
        <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-300 border-t border-gray-700 mt-1">
          <span>{t('lowerTotal')}</span>
          <span className="font-mono">{viewedTotals.lowerTotal}</span>
        </div>

        <div className={`flex items-center justify-between px-4 py-3 mt-1 rounded-lg text-base font-bold ${
          isViewingCurrentTurn ? 'bg-blue-900/40' : 'bg-blue-900/20'
        }`}>
          <span>{t('grandTotal')}</span>
          <span className="font-mono text-lg">{viewedTotals.grandTotal}</span>
        </div>
      </div>
    </div>
  )
}
