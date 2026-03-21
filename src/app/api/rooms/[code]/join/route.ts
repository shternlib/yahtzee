import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { serverBroadcast } from '@/lib/supabase/serverBroadcast'
import { errorResponse } from '@/lib/utils/errors'
import { sanitizeDisplayName } from '@/lib/utils/sanitize'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json()
  const { playerName, sessionId } = body

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0 || playerName.trim().length > 20) {
    return errorResponse('INVALID_NAME', 'Player name must be 1-20 characters', 400)
  }

  const supabase = createServerClient()

  // Find room
  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) {
    return errorResponse('ROOM_NOT_FOUND', 'Room not found', 404)
  }

  if (room.status !== 'lobby') {
    return errorResponse('GAME_STARTED', 'Game has already started', 409)
  }

  // Get current players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  if ((players || []).length >= room.max_players) {
    return errorResponse('ROOM_FULL', `Room already has ${room.max_players} players`, 409)
  }

  // Check for rejoin (same session)
  if (sessionId) {
    const existing = (players || []).find((p) => p.session_id === sessionId)
    if (existing) {
      return NextResponse.json({
        roomId: room.id,
        playerId: existing.id,
        sessionId: existing.session_id,
        playerIndex: existing.player_index,
        players: (players || []).map((p) => ({
          displayName: p.display_name,
          playerIndex: p.player_index,
          isBot: p.is_bot,
        })),
      })
    }
  }

  // Sanitize and resolve duplicate names
  let displayName = sanitizeDisplayName(playerName)
  const existingNames = (players || []).map((p) => p.display_name)
  if (existingNames.includes(displayName)) {
    let counter = 2
    while (existingNames.includes(`${displayName} ${counter}`)) counter++
    displayName = `${displayName} ${counter}`
  }

  // Determine player index
  const usedIndices = new Set((players || []).map((p) => p.player_index))
  let playerIndex = 0
  while (usedIndices.has(playerIndex)) playerIndex++

  // Always create a new anonymous session for new players (never trust client-provided sessionId)
  const { data: authData } = await supabase.auth.signInAnonymously()
  const finalSessionId = authData.session?.user.id
  if (!finalSessionId) {
    return errorResponse('INTERNAL_ERROR', 'Failed to create session', 500)
  }

  // Add player
  const { data: newPlayer, error } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      session_id: finalSessionId,
      display_name: displayName,
      player_index: playerIndex,
    })
    .select()
    .single()

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to join room', 500)
  }

  // Broadcast player joined
  await serverBroadcast(code.toUpperCase(), 'player_joined', {
    player: {
      id: newPlayer.id,
      displayName: newPlayer.display_name,
      playerIndex: newPlayer.player_index,
      isBot: false,
      isConnected: true,
    },
  })

  // Fetch updated players list
  const { data: updatedPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  return NextResponse.json({
    roomId: room.id,
    playerId: newPlayer.id,
    sessionId: finalSessionId,
    playerIndex: newPlayer.player_index,
    players: (updatedPlayers || []).map((p) => ({
      displayName: p.display_name,
      playerIndex: p.player_index,
      isBot: p.is_bot,
    })),
  })
}
