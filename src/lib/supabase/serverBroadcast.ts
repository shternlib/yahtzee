import { createServerClient } from './server'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

// Cache Supabase client at module level (reused across broadcasts)
let cachedClient: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createServerClient()
  }
  return cachedClient
}

// Cache active channels per room (reused within bot turns / rapid broadcasts)
const channelCache = new Map<string, { channel: RealtimeChannel; lastUsed: number }>()

// Clean up idle channels every 30s
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of channelCache) {
    if (now - entry.lastUsed > 30_000) {
      entry.channel.unsubscribe()
      channelCache.delete(key)
    }
  }
}, 30_000)
if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
  cleanupTimer.unref()
}

async function getChannel(roomCode: string): Promise<RealtimeChannel> {
  const key = `game:room:${roomCode}`
  const cached = channelCache.get(key)

  if (cached) {
    cached.lastUsed = Date.now()
    return cached.channel
  }

  const supabase = getClient()
  const channel = supabase.channel(key, {
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

  channelCache.set(key, { channel, lastUsed: Date.now() })
  return channel
}

/** Broadcast an event to all players in a room from the server side */
export async function serverBroadcast(
  roomCode: string,
  event: string,
  payload: Record<string, unknown>
) {
  const channel = await getChannel(roomCode)
  await channel.send({ type: 'broadcast', event, payload })
}
