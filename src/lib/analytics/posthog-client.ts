import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || typeof window === 'undefined' || initialized) return

  posthog.init(key, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  })
  initialized = true
}

/** Fire-and-forget client-side event. Never throws. */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return
    posthog.capture(event, properties)
  } catch {
    // Analytics must never break game logic
  }
}
