'use client'

import { useEffect } from 'react'
import { initPostHog } from '@/lib/analytics/posthog-client'

export function PostHogBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return <>{children}</>
}
