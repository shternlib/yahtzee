import { createServerClient } from './server'
import logger from '@/lib/utils/logger'

/** Broadcast an event to all players in a room from the server side */
export async function serverBroadcast(
  roomCode: string,
  event: string,
  payload: Record<string, unknown>
) {
  const supabase = createServerClient()
  const channel = supabase.channel(`game:room:${roomCode}`, {
    config: { broadcast: { self: true } },
  })

  // Subscribe with timeout to prevent hanging
  await Promise.race([
    new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve()
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          reject(new Error(`Channel subscription failed: ${status}`))
        }
      })
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Channel subscription timed out')), 5000)
    ),
  ])

  await channel.send({ type: 'broadcast', event, payload })
  await channel.unsubscribe()
}
