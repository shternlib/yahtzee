import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './client'

/** Create a game channel for a room */
export function createGameChannel(roomCode: string): RealtimeChannel {
  return supabase.channel(`game:room:${roomCode}`, {
    config: {
      broadcast: { self: false },
    },
  })
}
