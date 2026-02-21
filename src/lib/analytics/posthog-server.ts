const POSTHOG_HOST = 'https://us.i.posthog.com'

/** Server-side event tracking via direct HTTP. Works reliably in Vercel serverless. */
export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) return

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: 'dragon-dice-server',
        },
      }),
    })
  } catch {
    // Analytics must never break game logic
  }
}
