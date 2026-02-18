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

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      supabase.removeChannel(channel)
      reject(new Error('Broadcast subscribe timeout'))
    }, 5000)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel
          .send({ type: 'broadcast', event, payload })
          .then(() => {
            clearTimeout(timeout)
            supabase.removeChannel(channel)
            resolve()
          })
          .catch((err) => {
            clearTimeout(timeout)
            supabase.removeChannel(channel)
            reject(err)
          })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout)
        supabase.removeChannel(channel)
        reject(new Error(`Channel ${status}`))
      }
    })
  }).catch(() => {
    // Non-critical: don't fail the API request if broadcast fails
  })
}
