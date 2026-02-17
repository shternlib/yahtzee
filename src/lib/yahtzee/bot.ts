import {
  type Category,
  type ScorecardData,
  ALL_CATEGORIES,
  UPPER_CATEGORIES,
  UPPER_CATEGORY_VALUE,
  YAHTZEE_SCORE,
  LARGE_STRAIGHT_SCORE,
  FULL_HOUSE_SCORE,
  SMALL_STRAIGHT_SCORE,
} from './categories'
import { calculateScore, calculateAvailableScores } from './scoring'

/** Maximum possible score for each category (used for marginal value) */
const MAX_CATEGORY_SCORE: Record<Category, number> = {
  ones: 5,
  twos: 10,
  threes: 15,
  fours: 20,
  fives: 25,
  sixes: 30,
  threeOfAKind: 30,
  fourOfAKind: 30,
  fullHouse: FULL_HOUSE_SCORE,
  smallStraight: SMALL_STRAIGHT_SCORE,
  largeStraight: LARGE_STRAIGHT_SCORE,
  yahtzee: YAHTZEE_SCORE,
  chance: 30,
}

/** Choose which category to score. Greedy: pick highest marginal value. */
export function chooseCategory(
  dice: number[],
  scorecard: ScorecardData
): Category {
  const available = calculateAvailableScores(dice, scorecard)
  const entries = Object.entries(available) as [Category, number][]

  if (entries.length === 0) {
    throw new Error('No available categories')
  }

  // Sort by marginal value (actual / max), descending
  entries.sort((a, b) => {
    const marginalA = a[1] / MAX_CATEGORY_SCORE[a[0]]
    const marginalB = b[1] / MAX_CATEGORY_SCORE[b[0]]
    if (marginalB !== marginalA) return marginalB - marginalA
    // Tie-break: prefer higher absolute score
    return b[1] - a[1]
  })

  // If best score is 0, sacrifice the lowest-value category
  if (entries[0][1] === 0) {
    entries.sort((a, b) => MAX_CATEGORY_SCORE[a[0]] - MAX_CATEGORY_SCORE[b[0]])
  }

  return entries[0][0]
}

/** Choose which dice to hold for re-roll. Returns held array. */
export function chooseDiceToHold(
  dice: number[],
  scorecard: ScorecardData
): boolean[] {
  const available = calculateAvailableScores(dice, scorecard)
  const entries = Object.entries(available) as [Category, number][]

  if (entries.length === 0) {
    return dice.map(() => true) // hold everything
  }

  // Find target category (highest marginal value)
  entries.sort((a, b) => {
    const marginalA = a[1] / MAX_CATEGORY_SCORE[a[0]]
    const marginalB = b[1] / MAX_CATEGORY_SCORE[b[0]]
    return marginalB - marginalA
  })

  const targetCategory = entries[0][0]

  // Determine hold pattern based on target category
  return getHoldPattern(dice, targetCategory)
}

function getHoldPattern(dice: number[], target: Category): boolean[] {
  // Upper section: hold matching face values
  if (UPPER_CATEGORIES.includes(target as typeof UPPER_CATEGORIES[number])) {
    const faceValue = UPPER_CATEGORY_VALUE[target as keyof typeof UPPER_CATEGORY_VALUE]
    return dice.map((d) => d === faceValue)
  }

  const counts: Record<number, number> = {}
  for (const d of dice) counts[d] = (counts[d] || 0) + 1

  switch (target) {
    case 'threeOfAKind':
    case 'fourOfAKind':
    case 'yahtzee': {
      // Hold the most frequent value
      const maxVal = Object.entries(counts).sort(
        (a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0])
      )[0][0]
      return dice.map((d) => d === Number(maxVal))
    }

    case 'fullHouse': {
      // Hold pairs and triples
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
      const keepValues = new Set<number>()
      if (sorted.length >= 1) keepValues.add(Number(sorted[0][0]))
      if (sorted.length >= 2) keepValues.add(Number(sorted[1][0]))
      return dice.map((d) => keepValues.has(d))
    }

    case 'smallStraight':
    case 'largeStraight': {
      // Hold unique sequential values
      const unique = new Set<number>()
      return dice.map((d) => {
        if (unique.has(d)) return false
        unique.add(d)
        return true
      })
    }

    case 'chance': {
      // Hold high values (4, 5, 6)
      return dice.map((d) => d >= 4)
    }

    default:
      return dice.map(() => false)
  }
}

/** Decide whether to re-roll. Returns true if bot should roll again. */
export function shouldReroll(
  dice: number[],
  scorecard: ScorecardData,
  rollCount: number
): boolean {
  if (rollCount >= 3) return false

  const available = calculateAvailableScores(dice, scorecard)
  const entries = Object.entries(available) as [Category, number][]

  if (entries.length === 0) return false

  // If we already have a high-value result, stop
  const bestScore = Math.max(...entries.map(([, score]) => score))
  const bestCategory = entries.find(([, score]) => score === bestScore)!

  const marginalValue = bestScore / MAX_CATEGORY_SCORE[bestCategory[0]]

  // Don't reroll if we have Yahtzee, large straight, or >80% marginal value
  if (marginalValue >= 0.8) return false

  return true
}
