'use client'

interface CategoryRowProps {
  name: string
  score: number | null
  availableScore?: number
  onSelect?: () => void
  isInteractive: boolean
}

export function CategoryRow({ name, score, availableScore, onSelect, isInteractive }: CategoryRowProps) {
  const isAvailable = isInteractive && score === null && availableScore !== undefined
  const displayScore = score !== null ? score : availableScore !== undefined ? availableScore : null

  return (
    <button
      onClick={isAvailable ? onSelect : undefined}
      disabled={!isAvailable}
      className={`
        flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm
        transition-all duration-150
        ${isAvailable
          ? 'bg-blue-900/30 border border-blue-500/40 active:bg-blue-800/40 cursor-pointer'
          : score !== null
            ? 'bg-gray-800/40'
            : 'bg-gray-800/20'
        }
      `}
    >
      <span className={score !== null ? 'text-gray-300' : isAvailable ? 'text-blue-300' : 'text-gray-500'}>
        {name}
      </span>
      <span className={`font-mono font-bold ${
        score !== null ? 'text-white' : isAvailable ? 'text-green-400' : 'text-gray-600'
      }`}>
        {displayScore !== null ? displayScore : '—'}
      </span>
    </button>
  )
}
