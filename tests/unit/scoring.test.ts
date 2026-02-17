import { describe, it, expect } from 'vitest'
import { calculateScore, calculateAvailableScores, calculateTotals, isScorecardComplete } from '@/lib/yahtzee/scoring'
import { createEmptyScorecard } from '@/lib/yahtzee/categories'

describe('calculateScore', () => {
  // Upper section
  describe('upper section', () => {
    it('scores ones correctly', () => {
      expect(calculateScore([1, 1, 3, 4, 5], 'ones')).toBe(2)
      expect(calculateScore([2, 3, 4, 5, 6], 'ones')).toBe(0)
      expect(calculateScore([1, 1, 1, 1, 1], 'ones')).toBe(5)
    })

    it('scores twos correctly', () => {
      expect(calculateScore([2, 2, 2, 4, 5], 'twos')).toBe(6)
    })

    it('scores threes correctly', () => {
      expect(calculateScore([3, 3, 3, 3, 5], 'threes')).toBe(12)
    })

    it('scores fours correctly', () => {
      expect(calculateScore([4, 4, 4, 4, 4], 'fours')).toBe(20)
    })

    it('scores fives correctly', () => {
      expect(calculateScore([5, 5, 1, 2, 3], 'fives')).toBe(10)
    })

    it('scores sixes correctly', () => {
      expect(calculateScore([6, 6, 6, 1, 2], 'sixes')).toBe(18)
    })
  })

  // Lower section
  describe('three of a kind', () => {
    it('scores sum when 3+ of same', () => {
      expect(calculateScore([3, 3, 3, 4, 5], 'threeOfAKind')).toBe(18)
    })

    it('scores 0 when no three of a kind', () => {
      expect(calculateScore([1, 2, 3, 4, 5], 'threeOfAKind')).toBe(0)
    })

    it('scores sum with four of a kind', () => {
      expect(calculateScore([6, 6, 6, 6, 1], 'threeOfAKind')).toBe(25)
    })
  })

  describe('four of a kind', () => {
    it('scores sum when 4+ of same', () => {
      expect(calculateScore([5, 5, 5, 5, 3], 'fourOfAKind')).toBe(23)
    })

    it('scores 0 when only three of a kind', () => {
      expect(calculateScore([5, 5, 5, 3, 2], 'fourOfAKind')).toBe(0)
    })
  })

  describe('full house', () => {
    it('scores 25 for 3+2', () => {
      expect(calculateScore([2, 2, 3, 3, 3], 'fullHouse')).toBe(25)
    })

    it('scores 0 for non-full-house', () => {
      expect(calculateScore([1, 2, 3, 4, 5], 'fullHouse')).toBe(0)
    })

    it('scores 0 for five of a kind (not a full house)', () => {
      expect(calculateScore([3, 3, 3, 3, 3], 'fullHouse')).toBe(0)
    })
  })

  describe('small straight', () => {
    it('scores 30 for 1-2-3-4', () => {
      expect(calculateScore([1, 2, 3, 4, 6], 'smallStraight')).toBe(30)
    })

    it('scores 30 for 2-3-4-5', () => {
      expect(calculateScore([2, 3, 4, 5, 5], 'smallStraight')).toBe(30)
    })

    it('scores 30 for 3-4-5-6', () => {
      expect(calculateScore([1, 3, 4, 5, 6], 'smallStraight')).toBe(30)
    })

    it('scores 0 for non-straight', () => {
      expect(calculateScore([1, 2, 4, 5, 6], 'smallStraight')).toBe(0)
    })

    it('scores 30 for large straight (contains small)', () => {
      expect(calculateScore([1, 2, 3, 4, 5], 'smallStraight')).toBe(30)
    })
  })

  describe('large straight', () => {
    it('scores 40 for 1-2-3-4-5', () => {
      expect(calculateScore([1, 2, 3, 4, 5], 'largeStraight')).toBe(40)
    })

    it('scores 40 for 2-3-4-5-6', () => {
      expect(calculateScore([2, 3, 4, 5, 6], 'largeStraight')).toBe(40)
    })

    it('scores 0 for small straight', () => {
      expect(calculateScore([1, 2, 3, 4, 6], 'largeStraight')).toBe(0)
    })

    it('handles unordered dice', () => {
      expect(calculateScore([5, 3, 1, 4, 2], 'largeStraight')).toBe(40)
    })
  })

  describe('yahtzee', () => {
    it('scores 50 for five of a kind', () => {
      expect(calculateScore([4, 4, 4, 4, 4], 'yahtzee')).toBe(50)
    })

    it('scores 0 for non-yahtzee', () => {
      expect(calculateScore([4, 4, 4, 4, 3], 'yahtzee')).toBe(0)
    })
  })

  describe('chance', () => {
    it('sums all dice', () => {
      expect(calculateScore([1, 2, 3, 4, 5], 'chance')).toBe(15)
      expect(calculateScore([6, 6, 6, 6, 6], 'chance')).toBe(30)
    })
  })
})

describe('calculateAvailableScores', () => {
  it('returns scores for all categories when scorecard is empty', () => {
    const scorecard = createEmptyScorecard()
    const available = calculateAvailableScores([1, 2, 3, 4, 5], scorecard)
    expect(Object.keys(available)).toHaveLength(13)
  })

  it('excludes filled categories', () => {
    const scorecard = createEmptyScorecard()
    scorecard.ones = 3
    scorecard.yahtzee = 0
    const available = calculateAvailableScores([1, 1, 1, 1, 1], scorecard)
    expect(available.ones).toBeUndefined()
    expect(available.yahtzee).toBeUndefined()
    expect(available.twos).toBe(0)
  })
})

describe('calculateTotals', () => {
  it('calculates upper bonus when >= 63', () => {
    const scorecard = createEmptyScorecard()
    scorecard.ones = 3
    scorecard.twos = 6
    scorecard.threes = 12
    scorecard.fours = 12
    scorecard.fives = 15
    scorecard.sixes = 18 // total = 66 >= 63
    const totals = calculateTotals(scorecard)
    expect(totals.upperTotal).toBe(66)
    expect(totals.upperBonus).toBe(35)
  })

  it('no bonus when < 63', () => {
    const scorecard = createEmptyScorecard()
    scorecard.ones = 1
    scorecard.twos = 2
    scorecard.threes = 3
    scorecard.fours = 4
    scorecard.fives = 5
    scorecard.sixes = 6 // total = 21
    const totals = calculateTotals(scorecard)
    expect(totals.upperTotal).toBe(21)
    expect(totals.upperBonus).toBe(0)
  })

  it('calculates grand total correctly', () => {
    const scorecard = createEmptyScorecard()
    scorecard.ones = 3
    scorecard.twos = 6
    scorecard.threes = 9
    scorecard.fours = 12
    scorecard.fives = 15
    scorecard.sixes = 18
    scorecard.threeOfAKind = 20
    scorecard.fourOfAKind = 25
    scorecard.fullHouse = 25
    scorecard.smallStraight = 30
    scorecard.largeStraight = 40
    scorecard.yahtzee = 50
    scorecard.chance = 22
    const totals = calculateTotals(scorecard)
    expect(totals.grandTotal).toBe(63 + 35 + 212) // upper + bonus + lower
  })
})

describe('isScorecardComplete', () => {
  it('returns false for empty scorecard', () => {
    expect(isScorecardComplete(createEmptyScorecard())).toBe(false)
  })

  it('returns true when all filled', () => {
    const scorecard = createEmptyScorecard()
    scorecard.ones = 0
    scorecard.twos = 0
    scorecard.threes = 0
    scorecard.fours = 0
    scorecard.fives = 0
    scorecard.sixes = 0
    scorecard.threeOfAKind = 0
    scorecard.fourOfAKind = 0
    scorecard.fullHouse = 0
    scorecard.smallStraight = 0
    scorecard.largeStraight = 0
    scorecard.yahtzee = 0
    scorecard.chance = 0
    expect(isScorecardComplete(scorecard)).toBe(true)
  })
})
