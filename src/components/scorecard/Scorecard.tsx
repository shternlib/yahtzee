'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
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
            ? 'bg-dragon-orange/15 border border-dragon-orange/40 active:bg-dragon-orange/25'
            : isLastMove
              ? 'bg-yellow-500/10 border border-yellow-500/30'
              : score !== null
                ? 'bg-dragon-card-light/50'
                : 'bg-dragon-card/30'
          }
        `}
      >
        <span className={
          isLastMove ? 'text-yellow-300' : score !== null ? 'text-dragon-text/80' : canSelect ? 'text-dragon-orange' : 'text-dragon-muted/50'
        }>
          {t(cat)}
        </span>
        <span className={`font-mono text-base font-bold ${
          canSelect ? 'text-dragon-green text-lg' : isLastMove ? 'text-yellow-300' : score !== null ? 'text-dragon-text' : 'text-dragon-muted/30'
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
                ${isSelected ? 'bg-dragon-card-light scale-105' : 'bg-dragon-card/50 active:bg-dragon-card-light/50'}
                ${isTurn && !isSelected ? 'ring-2 ring-dragon-orange/50' : ''}
              `}
            >
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
                ${isMe ? 'bg-dragon-orange text-white' : player.isBot ? 'bg-dragon-purple text-white' : 'bg-dragon-blue text-white'}
                ${isTurn ? 'ring-2 ring-dragon-orange ring-offset-1 ring-offset-dragon-bg' : ''}
              `}>
                {player.displayName[0].toUpperCase()}
              </div>
              <span className={`text-[11px] truncate max-w-[68px] ${isSelected ? 'text-dragon-text' : 'text-dragon-muted'}`}>
                {player.displayName}
              </span>
              <span className={`text-xs font-mono font-bold ${isSelected ? 'text-dragon-text' : 'text-dragon-muted/60'}`}>
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
            isViewingCurrentTurn ? 'bg-dragon-orange/15 text-dragon-orange' : 'bg-dragon-card text-dragon-muted'
          }`}>
            {sortedPlayers.find(p => p.playerIndex === viewingIndex)?.displayName}
          </span>
        </div>
      )}

      {/* Scorecard */}
      <div className="relative">
        <Image
          src="/gavrik_liderboard.png"
          alt=""
          width={110}
          height={90}
          className="absolute -top-14 right-2 z-10 pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
        />
      <div className="flex flex-col gap-1 p-3 bg-dragon-card/60 rounded-2xl border border-dragon-purple/20">
        <h3 className="text-xs font-semibold text-dragon-muted uppercase tracking-wider px-2 mb-1">
          {t('upperSection')}
        </h3>
        {UPPER_CATEGORIES.map(renderRow)}
        <div className="flex items-center justify-between px-4 py-2 text-xs text-dragon-muted border-t border-dragon-purple/20 mt-1">
          <span>{t('upperBonus')}</span>
          <span className="font-mono">
            {viewedTotals.upperBonus > 0 ? `+${viewedTotals.upperBonus}` : `${viewedTotals.upperTotal}/63`}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-dragon-text/80 border-b border-dragon-purple/20 mb-2">
          <span>{t('upperTotal')}</span>
          <span className="font-mono">{viewedTotals.upperTotal + viewedTotals.upperBonus}</span>
        </div>

        <h3 className="text-xs font-semibold text-dragon-muted uppercase tracking-wider px-2 mb-1">
          {t('lowerSection')}
        </h3>
        {LOWER_CATEGORIES.map(renderRow)}
        <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-dragon-text/80 border-t border-dragon-purple/20 mt-1">
          <span>{t('lowerTotal')}</span>
          <span className="font-mono">{viewedTotals.lowerTotal}</span>
        </div>

        <div className={`flex items-center justify-between px-4 py-3 mt-1 rounded-xl text-base font-bold ${
          isViewingCurrentTurn ? 'bg-dragon-orange/20' : 'bg-dragon-purple/15'
        }`}>
          <span>{t('grandTotal')}</span>
          <span className="font-mono text-lg">{viewedTotals.grandTotal}</span>
        </div>
      </div>
      </div>
    </div>
  )
}
