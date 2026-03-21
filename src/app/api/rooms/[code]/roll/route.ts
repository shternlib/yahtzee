import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { serverBroadcast } from '@/lib/supabase/serverBroadcast'
import { errorResponse } from '@/lib/utils/errors'
import { generateDice, rollDice } from '@/lib/yahtzee/dice'
import { calculateAvailableScores } from '@/lib/yahtzee/scoring'
import { createEmptyScorecard } from '@/lib/yahtzee/categories'
import { loadRoomState, saveRoomState, createInitialState } from '@/lib/yahtzee/gameState'

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
  if (!sessionId) {
    return errorResponse('NOT_IN_GAME', 'Session ID is required', 401)
  }

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .eq('session_id', sessionId)
    .single()

  if (!player) {
    return errorResponse('NOT_IN_GAME', 'You are not in this game', 403)
  }

  if (player.player_index !== room.current_turn_player_index) {
    return errorResponse('NOT_YOUR_TURN', 'It is not your turn', 403)
  }

  // Get or initialize room game state from DB
  let state = await loadRoomState(supabase, room.id)
  if (!state) {
    const { data: players } = await supabase
      .from('players')
      .select('player_index')
      .eq('room_id', room.id)

    state = createInitialState((players || []).map(p => p.player_index))
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
  await saveRoomState(supabase, room.id, state)

  // Calculate available categories
  const playerIndex = room.current_turn_player_index
  const scorecard = state.scorecards[playerIndex] || createEmptyScorecard()
  const availableCategories = calculateAvailableScores(newDice, scorecard)

  // Broadcast dice roll to all players
  await serverBroadcast(code.toUpperCase(), 'dice_roll', {
    dice: newDice,
    rollCount: state.rollCount,
    playerIndex,
    availableCategories,
  })

  return NextResponse.json({
    dice: newDice,
    rollCount: state.rollCount,
    availableCategories,
  })
}
