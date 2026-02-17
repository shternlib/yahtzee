import { createServerClient } from './server'

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

  await channel.subscribe()
  await channel.send({ type: 'broadcast', event, payload })
  await channel.unsubscribe()
}
