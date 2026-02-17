'use client'

import { useTranslations } from 'next-intl'
import type { Category, ScorecardData } from '@/lib/yahtzee/categories'
import { UPPER_CATEGORIES, LOWER_CATEGORIES } from '@/lib/yahtzee/categories'
import { calculateTotals } from '@/lib/yahtzee/scoring'
import { CategoryRow } from './CategoryRow'

interface ScorecardProps {
  scorecard: ScorecardData
  availableCategories: Partial<Record<Category, number>>
  onSelectCategory?: (category: Category) => void
  isInteractive: boolean
}

export function Scorecard({ scorecard, availableCategories, onSelectCategory, isInteractive }: ScorecardProps) {
  const t = useTranslations('scorecard')
  const totals = calculateTotals(scorecard)

  return (
    <div className="flex flex-col gap-1 p-3 bg-gray-800/50 rounded-2xl">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
        {t('upperSection')}
      </h3>
      {UPPER_CATEGORIES.map((cat) => (
        <CategoryRow
          key={cat}
          name={t(cat)}
          score={scorecard[cat]}
          availableScore={availableCategories[cat]}
          onSelect={() => onSelectCategory?.(cat)}
          isInteractive={isInteractive}
        />
      ))}
      <div className="flex items-center justify-between px-3 py-1 text-xs text-gray-400 border-t border-gray-700 mt-1">
        <span>{t('upperBonus')}</span>
        <span className="font-mono">{totals.upperBonus > 0 ? `+${totals.upperBonus}` : `${totals.upperTotal}/63`}</span>
      </div>
      <div className="flex items-center justify-between px-3 py-1 text-xs font-bold text-gray-300 border-b border-gray-700 mb-2">
        <span>{t('upperTotal')}</span>
        <span className="font-mono">{totals.upperTotal + totals.upperBonus}</span>
      </div>

      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
        {t('lowerSection')}
      </h3>
      {LOWER_CATEGORIES.map((cat) => (
        <CategoryRow
          key={cat}
          name={t(cat)}
          score={scorecard[cat]}
          availableScore={availableCategories[cat]}
          onSelect={() => onSelectCategory?.(cat)}
          isInteractive={isInteractive}
        />
      ))}
      <div className="flex items-center justify-between px-3 py-1 text-xs font-bold text-gray-300 border-t border-gray-700 mt-1">
        <span>{t('lowerTotal')}</span>
        <span className="font-mono">{totals.lowerTotal}</span>
      </div>

      <div className="flex items-center justify-between px-3 py-2 mt-1 bg-blue-900/30 rounded-lg text-base font-bold">
        <span>{t('grandTotal')}</span>
        <span className="font-mono text-lg">{totals.grandTotal}</span>
      </div>
    </div>
  )
}
