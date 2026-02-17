import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './client'

/** Create a game channel for a room */
export function createGameChannel(roomCode: string): RealtimeChannel {
  return supabase.channel(`game:room:${roomCode}`, {
    config: {
      broadcast: { self: true },
    },
  })
}

/** Broadcast an event to all players in the room */
export async function broadcastEvent(
  channel: RealtimeChannel,
  event: string,
  payload: Record<string, unknown>
) {
  await channel.send({
    type: 'broadcast',
    event,
    payload,
  })
}
