import {
  type Category,
  type ScorecardData,
  type ScorecardTotals,
  type UpperCategory,
  UPPER_CATEGORIES,
  LOWER_CATEGORIES,
  UPPER_CATEGORY_VALUE,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  FULL_HOUSE_SCORE,
  SMALL_STRAIGHT_SCORE,
  LARGE_STRAIGHT_SCORE,
  YAHTZEE_SCORE,
} from './categories'

/** Count occurrences of each die face value (1-6) */
function countDice(dice: number[]): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const die of dice) {
    counts[die] = (counts[die] || 0) + 1
  }
  return counts
}

function sumAll(dice: number[]): number {
  return dice.reduce((sum, d) => sum + d, 0)
}

/** Calculate score for a specific category given dice values */
export function calculateScore(dice: number[], category: Category): number {
  const counts = countDice(dice)
  const values = Object.values(counts)
  const sum = sumAll(dice)

  // Upper section: sum of matching face values
  if (category in UPPER_CATEGORY_VALUE) {
    const faceValue = UPPER_CATEGORY_VALUE[category as UpperCategory]
    return (counts[faceValue] || 0) * faceValue
  }

  switch (category) {
    case 'threeOfAKind':
      return values.some((c) => c >= 3) ? sum : 0

    case 'fourOfAKind':
      return values.some((c) => c >= 4) ? sum : 0

    case 'fullHouse': {
      const hasThree = values.includes(3)
      const hasTwo = values.includes(2)
      return hasThree && hasTwo ? FULL_HOUSE_SCORE : 0
    }

    case 'smallStraight': {
      const unique = new Set(dice)
      const straights = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6],
      ]
      return straights.some((s) => s.every((v) => unique.has(v)))
        ? SMALL_STRAIGHT_SCORE
        : 0
    }

    case 'largeStraight': {
      const sorted = [...new Set(dice)].sort((a, b) => a - b)
      if (sorted.length !== 5) return 0
      const isConsecutive = sorted.every(
        (v, i) => i === 0 || v === sorted[i - 1] + 1
      )
      return isConsecutive ? LARGE_STRAIGHT_SCORE : 0
    }

    case 'yahtzee':
      return values.includes(5) ? YAHTZEE_SCORE : 0

    case 'chance':
      return sum

    default:
      return 0
  }
}

/** Calculate scores for all available (unfilled) categories */
export function calculateAvailableScores(
  dice: number[],
  scorecard: ScorecardData
): Partial<Record<Category, number>> {
  const available: Partial<Record<Category, number>> = {}

  for (const cat of [...UPPER_CATEGORIES, ...LOWER_CATEGORIES]) {
    if (scorecard[cat] === null) {
      available[cat] = calculateScore(dice, cat)
    }
  }

  return available
}

/** Calculate scorecard totals including upper bonus */
export function calculateTotals(scorecard: ScorecardData): ScorecardTotals {
  let upperTotal = 0
  for (const cat of UPPER_CATEGORIES) {
    upperTotal += scorecard[cat] ?? 0
  }

  const upperBonus = upperTotal >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0

  let lowerTotal = 0
  for (const cat of LOWER_CATEGORIES) {
    lowerTotal += scorecard[cat] ?? 0
  }

  return {
    upperTotal,
    upperBonus,
    lowerTotal,
    grandTotal: upperTotal + upperBonus + lowerTotal,
  }
}

/** Check if scorecard is completely filled */
export function isScorecardComplete(scorecard: ScorecardData): boolean {
  for (const cat of [...UPPER_CATEGORIES, ...LOWER_CATEGORIES]) {
    if (scorecard[cat] === null) return false
  }
  return true
}
