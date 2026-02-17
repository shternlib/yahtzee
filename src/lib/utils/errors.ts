import { NextResponse } from 'next/server'

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_STARTED'
  | 'NOT_YOUR_TURN'
  | 'INVALID_CATEGORY'
  | 'CATEGORY_FILLED'
  | 'NOT_HOST'
  | 'INVALID_NAME'
  | 'MUST_ROLL_FIRST'
  | 'MAX_ROLLS_REACHED'
  | 'NOT_ENOUGH_PLAYERS'
  | 'GAME_NOT_IN_PROGRESS'
  | 'NOT_IN_GAME'
  | 'NO_CATEGORIES'
  | 'INTERNAL_ERROR'

export function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}
