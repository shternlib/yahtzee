import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import { loadRoomState } from '@/lib/yahtzee/gameState'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return errorResponse('NOT_IN_GAME', 'Session ID is required', 401)
  }

  const supabase = createServerClient()

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) {
    return errorResponse('ROOM_NOT_FOUND', 'Room not found', 404)
  }

  // Verify the requester is a player in this game
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  const isPlayer = (players || []).some((p) => p.session_id === sessionId)
  if (!isPlayer) {
    return errorResponse('NOT_IN_GAME', 'You are not a player in this game', 403)
  }

  // Load game state from DB
  const gameState = await loadRoomState(supabase, room.id)

  return NextResponse.json({
    roomCode: room.code,
    roomId: room.id,
    status: room.status,
    currentRound: room.current_round,
    currentTurnPlayerIndex: room.current_turn_player_index,
    players: (players || []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      playerIndex: p.player_index,
      isBot: p.is_bot,
      isConnected: p.is_connected,
    })),
    gameState: gameState || null,
  })
}
