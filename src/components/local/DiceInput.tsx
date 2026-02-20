'use client'

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
}

interface DiceInputProps {
  dice: number[]
  onTapDie: (index: number) => void
  disabled: boolean
}

export function DiceInput({ dice, onTapDie, disabled }: DiceInputProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 py-4">
      {dice.map((value, index) => (
        <button
          key={index}
          onClick={() => !disabled && onTapDie(index)}
          disabled={disabled}
          className={`
            relative w-16 h-16 rounded-2xl transition-all duration-150
            ${value > 0
              ? 'bg-[#faf5ee] border-2 border-dragon-green/50 shadow-md'
              : 'bg-dragon-card border-2 border-dragon-purple/30 shadow-md'
            }
            ${!disabled ? 'active:scale-90 cursor-pointer' : 'cursor-default'}
          `}
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
          {value === 0 && (
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-dragon-muted/40">
              ?
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
