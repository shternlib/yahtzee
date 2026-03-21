import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const supabase = createServerClient()

  // Accept sessionId from query params for caller identification
  const url = new URL(request.url)
  const callerSessionId = url.searchParams.get('sessionId')

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) {
    return errorResponse('ROOM_NOT_FOUND', 'Room not found', 404)
  }

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  return NextResponse.json({
    roomCode: room.code,
    roomId: room.id,
    status: room.status,
    maxPlayers: room.max_players,
    currentRound: room.current_round,
    currentTurnPlayerIndex: room.current_turn_player_index,
    isHost: callerSessionId ? room.host_session_id === callerSessionId : false,
    players: (players || []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      playerIndex: p.player_index,
      isBot: p.is_bot,
      isConnected: p.is_connected,
      isMe: callerSessionId ? p.session_id === callerSessionId : false,
    })),
  })
}
