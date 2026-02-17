import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateRoomCode } from '@/lib/utils/room-code'
import { errorResponse } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { hostName, maxPlayers = 4 } = body

  // Validate
  if (!hostName || typeof hostName !== 'string' || hostName.trim().length === 0 || hostName.trim().length > 20) {
    return errorResponse('INVALID_NAME', 'Host name must be 1-20 characters', 400)
  }

  const supabase = createServerClient()

  // Generate unique room code (retry on collision)
  let roomCode: string
  let attempts = 0
  do {
    roomCode = generateRoomCode()
    attempts++
    if (attempts > 10) {
      return errorResponse('INTERNAL_ERROR', 'Failed to generate room code', 500)
    }
    const { data: existing } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('code', roomCode)
      .single()
    if (!existing) break
  } while (true)

  // Generate session ID for host
  const sessionId = crypto.randomUUID()

  // Create room
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .insert({
      code: roomCode,
      host_session_id: sessionId,
      max_players: Math.min(Math.max(maxPlayers, 2), 4),
    })
    .select()
    .single()

  if (roomError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to create room', 500)
  }

  // Add host as first player
  const { error: playerError } = await supabase.from('players').insert({
    room_id: room.id,
    session_id: sessionId,
    display_name: hostName.trim(),
    player_index: 0,
  })

  if (playerError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to add host player', 500)
  }

  return NextResponse.json(
    {
      roomCode,
      roomId: room.id,
      sessionId,
    },
    { status: 201 }
  )
}
