'use client'

import { useTranslations } from 'next-intl'
import type { Category, ScorecardData } from '@/lib/yahtzee/categories'
import { UPPER_CATEGORIES, LOWER_CATEGORIES } from '@/lib/yahtzee/categories'
import { calculateTotals } from '@/lib/yahtzee/scoring'
import type { PlayerInfo } from '@/context/gameReducer'

interface ScorecardProps {
  players: PlayerInfo[]
  scorecards: Record<number, ScorecardData>
  currentTurnIndex: number
  myPlayerIndex: number | null
  availableCategories: Partial<Record<Category, number>>
  onSelectCategory?: (category: Category) => void
  isInteractive: boolean
}

export function Scorecard({
  players,
  scorecards,
  currentTurnIndex,
  myPlayerIndex,
  availableCategories,
  onSelectCategory,
  isInteractive,
}: ScorecardProps) {
  const t = useTranslations('scorecard')

  const sortedPlayers = [...players].sort((a, b) => a.playerIndex - b.playerIndex)
  const totalsMap = new Map(
    sortedPlayers.map((p) => [p.playerIndex, calculateTotals(scorecards[p.playerIndex] || {} as ScorecardData)])
  )

  function renderCategoryRow(cat: Category) {
    return (
      <tr key={cat} className="border-b border-gray-700/50">
        <td className="sticky left-0 z-10 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 whitespace-nowrap">
          {t(cat)}
        </td>
        {sortedPlayers.map((player) => {
          const sc = scorecards[player.playerIndex]
          const score = sc ? sc[cat] : null
          const isMe = player.playerIndex === myPlayerIndex
          const isTurn = player.playerIndex === currentTurnIndex
          const available = isMe && isInteractive ? availableCategories[cat] : undefined
          const canSelect = isMe && isInteractive && score === null && available !== undefined

          return (
            <td
              key={player.playerIndex}
              className={`px-1 py-1.5 text-center text-xs font-mono relative
                ${isTurn ? 'bg-blue-900/25' : ''}
              `}
              onClick={canSelect ? () => onSelectCategory?.(cat) : undefined}
            >
              {canSelect ? (
                <span className="text-green-400 font-bold cursor-pointer active:text-green-300">
                  {available}
                </span>
              ) : score !== null ? (
                <span className={`font-bold ${isMe ? 'text-white' : 'text-gray-300'}`}>
                  {score}
                </span>
              ) : (
                <span className="text-gray-600">&mdash;</span>
              )}
            </td>
          )
        })}
      </tr>
    )
  }

  function renderTotalRow(label: string, getValue: (playerIndex: number) => string | number, bold?: boolean) {
    return (
      <tr className={bold ? 'border-t-2 border-gray-600' : 'border-t border-gray-700/50'}>
        <td className={`sticky left-0 z-10 bg-gray-900 px-2 py-1.5 text-xs whitespace-nowrap ${bold ? 'font-bold text-gray-200' : 'text-gray-400'}`}>
          {label}
        </td>
        {sortedPlayers.map((player) => {
          const isTurn = player.playerIndex === currentTurnIndex
          return (
            <td
              key={player.playerIndex}
              className={`px-1 py-1.5 text-center text-xs font-mono ${bold ? 'font-bold text-white' : 'text-gray-400'} ${isTurn ? 'bg-blue-900/25' : ''}`}
            >
              {getValue(player.playerIndex)}
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-0">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="sticky left-0 z-20 bg-gray-800 px-2 py-2 text-left text-[10px] text-gray-500 uppercase tracking-wider w-24" />
              {sortedPlayers.map((player) => {
                const isTurn = player.playerIndex === currentTurnIndex
                const isMe = player.playerIndex === myPlayerIndex
                const total = totalsMap.get(player.playerIndex)
                return (
                  <th
                    key={player.playerIndex}
                    className={`px-1 py-2 text-center min-w-[52px] ${isTurn ? 'bg-blue-900/25' : ''}`}
                  >
                    <div className={`
                      inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold mb-0.5
                      ${isMe ? 'bg-blue-600 text-white' : player.isBot ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-200'}
                      ${isTurn ? 'ring-2 ring-blue-400' : ''}
                    `}>
                      {player.displayName[0].toUpperCase()}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate max-w-[52px]">
                      {player.displayName}
                    </div>
                    <div className="text-[10px] font-mono font-bold text-gray-300">
                      {total?.grandTotal ?? 0}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {/* Upper section header */}
            <tr>
              <td
                colSpan={sortedPlayers.length + 1}
                className="px-2 pt-2 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-900/50"
              >
                {t('upperSection')}
              </td>
            </tr>
            {UPPER_CATEGORIES.map((cat) => renderCategoryRow(cat))}
            {renderTotalRow(
              t('upperBonus'),
              (idx) => {
                const tot = totalsMap.get(idx)
                return tot && tot.upperBonus > 0 ? `+${tot.upperBonus}` : `${tot?.upperTotal ?? 0}/63`
              }
            )}
            {renderTotalRow(t('upperTotal'), (idx) => {
              const tot = totalsMap.get(idx)
              return (tot?.upperTotal ?? 0) + (tot?.upperBonus ?? 0)
            }, true)}

            {/* Lower section header */}
            <tr>
              <td
                colSpan={sortedPlayers.length + 1}
                className="px-2 pt-3 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-900/50"
              >
                {t('lowerSection')}
              </td>
            </tr>
            {LOWER_CATEGORIES.map((cat) => renderCategoryRow(cat))}
            {renderTotalRow(t('lowerTotal'), (idx) => totalsMap.get(idx)?.lowerTotal ?? 0, true)}

            {/* Grand total */}
            <tr className="border-t-2 border-gray-500">
              <td className="sticky left-0 z-10 bg-blue-900/30 px-2 py-2 text-sm font-bold text-white whitespace-nowrap">
                {t('grandTotal')}
              </td>
              {sortedPlayers.map((player) => {
                const isTurn = player.playerIndex === currentTurnIndex
                return (
                  <td
                    key={player.playerIndex}
                    className={`px-1 py-2 text-center text-sm font-mono font-bold text-white ${isTurn ? 'bg-blue-900/40' : 'bg-blue-900/20'}`}
                  >
                    {totalsMap.get(player.playerIndex)?.grandTotal ?? 0}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
