export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface WindowEntry {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

export class RateLimiter {
  private windows: Map<string, WindowEntry>
  private cleanupTimer: ReturnType<typeof setInterval>

  constructor(private config: RateLimitConfig) {
    this.windows = new Map()
    const timer = setInterval(() => this.cleanup(), 60_000)
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref()
    }
    this.cleanupTimer = timer
  }

  check(key: string): RateLimitResult {
    const now = Date.now()
    const entry = this.windows.get(key)

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + this.config.windowMs
      this.windows.set(key, { count: 1, resetAt })
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetAt,
      }
    }

    entry.count++
    const allowed = entry.count <= this.config.maxRequests
    return {
      allowed,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.windows) {
      if (now >= entry.resetAt) {
        this.windows.delete(key)
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupTimer)
    this.windows.clear()
  }
}

// Pre-configured rate limiters for each tier
const ONE_MINUTE = 60_000

export const rateLimiters = {
  createRoom: new RateLimiter({ windowMs: ONE_MINUTE, maxRequests: 5 }),
  joinOrManage: new RateLimiter({ windowMs: ONE_MINUTE, maxRequests: 10 }),
  gameAction: new RateLimiter({ windowMs: ONE_MINUTE, maxRequests: 30 }),
  read: new RateLimiter({ windowMs: ONE_MINUTE, maxRequests: 60 }),
}

export type RateLimitTier = keyof typeof rateLimiters
