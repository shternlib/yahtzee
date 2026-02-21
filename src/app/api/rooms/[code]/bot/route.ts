import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, broadcastToRoom } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import { trackServerEvent } from '@/lib/analytics/posthog-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json()
  const { botName = 'Bot', sessionId } = body

  const supabase = createServerClient()

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) {
    return errorResponse('ROOM_NOT_FOUND', 'Room not found', 404)
  }

  if (sessionId && room.host_session_id !== sessionId) {
    return errorResponse('NOT_HOST', 'Only the host can add bots', 403)
  }

  if (room.status !== 'lobby') {
    return errorResponse('GAME_STARTED', 'Game has already started', 409)
  }

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)

  if ((players || []).length >= room.max_players) {
    return errorResponse('ROOM_FULL', `Room already has ${room.max_players} players`, 409)
  }

  // Determine bot index
  const usedIndices = new Set((players || []).map((p) => p.player_index))
  let playerIndex = 0
  while (usedIndices.has(playerIndex)) playerIndex++

  // Resolve bot name
  let displayName = botName.trim() || 'Bot'
  const existingNames = (players || []).map((p) => p.display_name)
  if (existingNames.includes(displayName)) {
    let counter = 2
    while (existingNames.includes(`${displayName} ${counter}`)) counter++
    displayName = `${displayName} ${counter}`
  }

  const { data: bot, error } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      session_id: `bot-${crypto.randomUUID()}`,
      display_name: displayName,
      player_index: playerIndex,
      is_bot: true,
    })
    .select()
    .single()

  if (error) {
    return errorResponse('INTERNAL_ERROR' as any, 'Failed to add bot', 500)
  }

  // Broadcast to other players in the room
  await broadcastToRoom(code.toUpperCase(), 'player_joined', {
    player: {
      id: bot.id,
      displayName: bot.display_name,
      playerIndex: bot.player_index,
      isBot: true,
      isConnected: true,
    },
  })

  trackServerEvent(sessionId || 'anonymous', 'bot_added', {
    room_code: code.toUpperCase(),
    player_count: (players || []).length + 1,
  })

  return NextResponse.json({
    playerId: bot.id,
    playerIndex: bot.player_index,
    displayName: bot.display_name,
    isBot: true,
  })
}
