import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

function getPostHog(): PostHog | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) return null

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host: 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return posthogClient
}

/** Fire-and-forget server-side event. Never throws, never blocks. */
export function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  try {
    const ph = getPostHog()
    if (!ph) return
    ph.capture({ distinctId, event, properties })
  } catch {
    // Analytics must never break game logic
  }
}
