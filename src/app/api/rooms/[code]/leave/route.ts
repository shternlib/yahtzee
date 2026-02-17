import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json().catch(() => ({}))
  const { sessionId } = body

  if (!sessionId) {
    return errorResponse('MISSING_SESSION', 'Session ID is required', 400)
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

  if (room.status !== 'lobby') {
    return errorResponse('GAME_STARTED', 'Cannot leave after game has started', 409)
  }

  // Find the player
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .eq('session_id', sessionId)
    .single()

  if (!player) {
    return errorResponse('NOT_IN_GAME', 'You are not in this game', 404)
  }

  // Remove the player
  await supabase.from('players').delete().eq('id', player.id)

  // Get remaining players
  const { data: remaining } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  const remainingPlayers = remaining || []

  // If no players left, delete the room
  if (remainingPlayers.length === 0) {
    await supabase.from('game_rooms').delete().eq('id', room.id)
    return NextResponse.json({ left: true, roomDeleted: true })
  }

  // If host left, transfer to next human player (or first player)
  if (room.host_session_id === sessionId) {
    const nextHost = remainingPlayers.find(p => !p.is_bot) || remainingPlayers[0]
    await supabase
      .from('game_rooms')
      .update({ host_session_id: nextHost.session_id })
      .eq('id', room.id)
  }

  return NextResponse.json({ left: true, roomDeleted: false })
}
