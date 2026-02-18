import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Server-side Supabase client for API routes */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

/** Broadcast an event to all players in a room's realtime channel */
export async function broadcastToRoom(
  roomCode: string,
  event: string,
  payload: Record<string, unknown>
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const channel = supabase.channel(`game:room:${roomCode}`)
  await channel.subscribe()
  await channel.send({ type: 'broadcast', event, payload })
  supabase.removeChannel(channel)
}
