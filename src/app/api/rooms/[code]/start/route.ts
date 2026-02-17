import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import { executeBotTurns } from '@/lib/yahtzee/botExecutor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json().catch(() => ({}))
  const { sessionId } = body

  const supabase = createServerClient()

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) {
    return errorResponse('ROOM_NOT_FOUND', 'Room not found', 404)
  }

  // Verify host
  if (sessionId && room.host_session_id !== sessionId) {
    return errorResponse('NOT_HOST', 'Only the host can start the game', 403)
  }

  if (room.status !== 'lobby') {
    return errorResponse('GAME_STARTED', 'Game has already started', 409)
  }

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  if ((players || []).length < 2) {
    return errorResponse('NOT_ENOUGH_PLAYERS', 'Need at least 2 players', 409)
  }

  // Update room status
  const { error } = await supabase
    .from('game_rooms')
    .update({
      status: 'playing',
      started_at: new Date().toISOString(),
      current_turn_player_index: 0,
      current_round: 1,
    })
    .eq('id', room.id)

  if (error) {
    return errorResponse('INTERNAL_ERROR' as any, 'Failed to start game', 500)
  }

  const turnOrder = (players || []).map((p) => p.player_index)

  // If first player is a bot, auto-play their turn
  const firstPlayer = (players || []).find(p => p.player_index === 0)
  if (firstPlayer?.is_bot) {
    executeBotTurns(room.id, code.toUpperCase(), 0, 1, (players || []).length)
      .catch(err => console.error('Bot execution error:', err))
  }

  return NextResponse.json({
    status: 'playing',
    turnOrder,
    firstPlayer: 0,
  })
}
