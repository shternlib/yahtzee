'use client'

import { useTranslations } from 'next-intl'

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
}

interface DiceSceneProps {
  dice: number[]
  held: boolean[]
  onToggleHold: (index: number) => void
  rolling: boolean
  disabled: boolean
}

export function DiceScene({ dice, held, onToggleHold, rolling, disabled }: DiceSceneProps) {
  const t = useTranslations('game')

  return (
    <div className="flex flex-wrap justify-center gap-3 py-4">
      {dice.map((value, index) => (
        <button
          key={index}
          onClick={() => !disabled && onToggleHold(index)}
          disabled={disabled}
          className={`
            dice-face relative w-16 h-16 rounded-2xl
            ${rolling && !held[index] ? 'dice-rolling' : ''}
            ${held[index]
              ? 'bg-dragon-orange/15 border-3 border-dragon-orange shadow-lg shadow-dragon-orange/25 -translate-y-1'
              : 'bg-[#faf5ee] border-2 border-[#e8d5b8] shadow-md'
            }
            ${!disabled ? 'active:scale-95 cursor-pointer' : 'cursor-default'}
            transition-all duration-200
          `}
          aria-label={`Die ${index + 1}: ${value}${held[index] ? ` (${t('held')})` : ''}`}
        >
          {value > 0 && DOT_POSITIONS[value]?.map(([x, y], dotIndex) => (
            <span
              key={dotIndex}
              className="absolute w-2.5 h-2.5 rounded-full bg-dragon-bg"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
          {held[index] && (
            <span className="absolute -top-2 -right-2 bg-dragon-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm">
              H
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
