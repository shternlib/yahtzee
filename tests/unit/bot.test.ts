import { describe, it, expect } from 'vitest'
import { chooseCategory, chooseDiceToHold, shouldReroll } from '@/lib/yahtzee/bot'
import { createEmptyScorecard } from '@/lib/yahtzee/categories'

describe('chooseCategory', () => {
  it('picks yahtzee when available and dice match', () => {
    const scorecard = createEmptyScorecard()
    const result = chooseCategory([5, 5, 5, 5, 5], scorecard)
    expect(result).toBe('yahtzee')
  })

  it('picks large straight when available', () => {
    const scorecard = createEmptyScorecard()
    const result = chooseCategory([1, 2, 3, 4, 5], scorecard)
    expect(result).toBe('largeStraight')
  })

  it('sacrifices low-value category when no match', () => {
    const scorecard = createEmptyScorecard()
    // Fill most categories, leave only ones and twos
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
    // Dice that don't match ones or twos well
    const result = chooseCategory([3, 4, 5, 6, 6], scorecard)
    expect(['ones', 'twos']).toContain(result)
  })

  it('returns a valid available category', () => {
    const scorecard = createEmptyScorecard()
    const result = chooseCategory([1, 3, 2, 5, 4], scorecard)
    expect(scorecard[result]).toBeNull() // must be unfilled
  })
})

describe('chooseDiceToHold', () => {
  it('holds matching dice for upper section target', () => {
    const scorecard = createEmptyScorecard()
    const held = chooseDiceToHold([5, 5, 5, 2, 3], scorecard)
    // Should hold the 5s
    expect(held[0]).toBe(true)
    expect(held[1]).toBe(true)
    expect(held[2]).toBe(true)
  })

  it('returns a boolean array of length 5', () => {
    const scorecard = createEmptyScorecard()
    const held = chooseDiceToHold([1, 2, 3, 4, 5], scorecard)
    expect(held).toHaveLength(5)
    held.forEach((h) => expect(typeof h).toBe('boolean'))
  })
})

describe('shouldReroll', () => {
  it('does not reroll on yahtzee', () => {
    const scorecard = createEmptyScorecard()
    expect(shouldReroll([6, 6, 6, 6, 6], scorecard, 1)).toBe(false)
  })

  it('does not reroll on large straight', () => {
    const scorecard = createEmptyScorecard()
    expect(shouldReroll([1, 2, 3, 4, 5], scorecard, 1)).toBe(false)
  })

  it('does not reroll at roll count 3', () => {
    const scorecard = createEmptyScorecard()
    expect(shouldReroll([1, 2, 1, 3, 4], scorecard, 3)).toBe(false)
  })

  it('rerolls on a mediocre hand', () => {
    const scorecard = createEmptyScorecard()
    // [1, 1, 3, 5, 6] — no strong pattern, best is chance or pair of 1s
    expect(shouldReroll([1, 1, 3, 5, 6], scorecard, 1)).toBe(true)
  })
})
