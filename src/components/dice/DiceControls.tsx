'use client'

import { useTranslations } from 'next-intl'
import { MAX_ROLLS } from '@/lib/yahtzee/categories'

interface DiceControlsProps {
  rollCount: number
  onRoll: () => void
  disabled: boolean
  isMyTurn: boolean
}

export function DiceControls({ rollCount, onRoll, disabled, isMyTurn }: DiceControlsProps) {
  const t = useTranslations('game')
  const rollsLeft = MAX_ROLLS - rollCount
  const canRoll = isMyTurn && rollsLeft > 0 && !disabled

  return (
    <div className="flex flex-col items-center gap-2 px-4">
      <button
        onClick={onRoll}
        disabled={!canRoll}
        className={`
          w-full max-w-xs py-4 rounded-2xl text-lg font-bold
          transition-all duration-200
          ${canRoll
            ? 'bg-dragon-orange text-white active:bg-dragon-orange-dark active:scale-[0.98] shadow-lg shadow-dragon-orange/30'
            : 'bg-dragon-card text-dragon-muted cursor-not-allowed'
          }
        `}
      >
        {rollCount === 0 ? t('roll') : rollsLeft > 0 ? `${t('roll')} (${rollsLeft})` : t('selectCategory')}
      </button>
      {rollCount > 0 && rollsLeft > 0 && (
        <p className="text-sm text-dragon-muted">
          {t('rollsLeft', { count: rollsLeft })}
        </p>
      )}
    </div>
  )
}
