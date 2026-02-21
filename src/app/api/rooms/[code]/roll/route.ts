import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, broadcastToRoom } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import { generateDice, rollDice } from '@/lib/yahtzee/dice'
import { trackServerEvent } from '@/lib/analytics/posthog-server'
import { calculateAvailableScores } from '@/lib/yahtzee/scoring'
import { createEmptyScorecard, type ScorecardData } from '@/lib/yahtzee/categories'

export interface RoomDiceState {
  dice: number[]
  rollCount: number
  held: boolean[]
  scorecards: Record<number, ScorecardData>
}

/** Load game state from Supabase */
export async function loadRoomState(roomId: string): Promise<RoomDiceState | null> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('game_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single()
  return data?.game_state as RoomDiceState | null
}

/** Save game state to Supabase */
export async function saveRoomState(roomId: string, state: RoomDiceState | null) {
  const supabase = createServerClient()
  await supabase
    .from('game_rooms')
    .update({ game_state: state })
    .eq('id', roomId)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json()
  const { held = [false, false, false, false, false], sessionId } = body

  const supabase = createServerClient()

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) {
    return errorResponse('ROOM_NOT_FOUND', 'Room not found', 404)
  }

  if (room.status !== 'playing') {
    return errorResponse('GAME_NOT_IN_PROGRESS', 'Game is not in progress', 409)
  }

  // Verify it's this player's turn
  if (sessionId) {
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .eq('session_id', sessionId)
      .single()

    if (!player || player.player_index !== room.current_turn_player_index) {
      return errorResponse('NOT_YOUR_TURN', 'It is not your turn', 403)
    }
  }

  // Get or initialize room dice state
  let state = await loadRoomState(room.id)
  if (!state) {
    const { data: players } = await supabase
      .from('players')
      .select('player_index')
      .eq('room_id', room.id)

    const scorecards: Record<number, ScorecardData> = {}
    for (const p of players || []) {
      scorecards[p.player_index] = createEmptyScorecard()
    }

    state = {
      dice: [0, 0, 0, 0, 0],
      rollCount: 0,
      held: [false, false, false, false, false],
      scorecards,
    }
  }

  if (state.rollCount >= 3) {
    return errorResponse('MAX_ROLLS_REACHED', 'Already rolled 3 times this turn', 409)
  }

  // Roll dice
  const newDice =
    state.rollCount === 0
      ? generateDice()
      : rollDice(state.dice, held)

  state.dice = newDice
  state.rollCount += 1
  state.held = held
  await saveRoomState(room.id, state)

  // Calculate available categories
  const playerIndex = room.current_turn_player_index
  const scorecard = state.scorecards[playerIndex] || createEmptyScorecard()
  const availableCategories = calculateAvailableScores(newDice, scorecard)

  // Broadcast dice roll to other players
  await broadcastToRoom(code.toUpperCase(), 'dice_roll', {
    dice: newDice,
    rollCount: state.rollCount,
    availableCategories,
  })

  trackServerEvent(sessionId || 'anonymous', 'dice_rolled', {
    room_code: code.toUpperCase(),
    roll_number: state.rollCount,
  })

  return NextResponse.json({
    dice: newDice,
    rollCount: state.rollCount,
    availableCategories,
  })
}
