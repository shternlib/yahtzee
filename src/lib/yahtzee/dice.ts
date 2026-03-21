import { randomInt } from 'crypto'
import { DICE_COUNT } from './categories'

/** Generate a random die value (1-6) using cryptographic randomness */
function rollOne(): number {
  return randomInt(1, 7)
}

/** Generate a fresh set of 5 dice */
export function generateDice(): number[] {
  return Array.from({ length: DICE_COUNT }, () => rollOne())
}

/** Roll dice respecting held positions. Held dice keep their values. */
export function rollDice(
  current: number[],
  held: boolean[]
): number[] {
  return current.map((value, i) => (held[i] ? value : rollOne()))
}

/** Create initial held state (nothing held) */
export function createEmptyHeld(): boolean[] {
  return Array.from({ length: DICE_COUNT }, () => false)
}
