export const UPPER_CATEGORIES = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
] as const

export const LOWER_CATEGORIES = [
  'threeOfAKind',
  'fourOfAKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'yahtzee',
  'chance',
] as const

export const ALL_CATEGORIES = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES] as const

export type UpperCategory = (typeof UPPER_CATEGORIES)[number]
export type LowerCategory = (typeof LOWER_CATEGORIES)[number]
export type Category = (typeof ALL_CATEGORIES)[number]

export interface ScorecardData {
  ones: number | null
  twos: number | null
  threes: number | null
  fours: number | null
  fives: number | null
  sixes: number | null
  threeOfAKind: number | null
  fourOfAKind: number | null
  fullHouse: number | null
  smallStraight: number | null
  largeStraight: number | null
  yahtzee: number | null
  chance: number | null
}

export interface ScorecardTotals {
  upperTotal: number
  upperBonus: number
  lowerTotal: number
  grandTotal: number
}

export function createEmptyScorecard(): ScorecardData {
  return {
    ones: null,
    twos: null,
    threes: null,
    fours: null,
    fives: null,
    sixes: null,
    threeOfAKind: null,
    fourOfAKind: null,
    fullHouse: null,
    smallStraight: null,
    largeStraight: null,
    yahtzee: null,
    chance: null,
  }
}

export function isCategory(value: string): value is Category {
  return ALL_CATEGORIES.includes(value as Category)
}

/** Maps upper category to the dice face value it counts */
export const UPPER_CATEGORY_VALUE: Record<UpperCategory, number> = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
}

export const UPPER_BONUS_THRESHOLD = 63
export const UPPER_BONUS_VALUE = 35
export const FULL_HOUSE_SCORE = 25
export const SMALL_STRAIGHT_SCORE = 30
export const LARGE_STRAIGHT_SCORE = 40
export const YAHTZEE_SCORE = 50
export const TOTAL_ROUNDS = 13
export const DICE_COUNT = 5
export const MAX_ROLLS = 3
