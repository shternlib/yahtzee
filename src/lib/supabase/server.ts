import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Server-side Supabase client for API routes */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

/** Broadcast an event to all players in a room via Supabase Realtime HTTP API.
 *  Uses HTTP instead of WebSocket — reliable in Vercel serverless. */
export async function broadcastToRoom(
  roomCode: string,
  event: string,
  payload: Record<string, unknown>
) {
  try {
    await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `game:room:${roomCode}`,
            event,
            payload,
          },
        ],
      }),
    })
  } catch {
    // Non-critical: don't fail the API request if broadcast fails
  }
}
