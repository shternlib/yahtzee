import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import {
  rateLimiters,
  type RateLimitResult,
  type RateLimitTier,
} from './lib/utils/rate-limit'
import logger from './lib/utils/logger'

const intlMiddleware = createMiddleware(routing)

/** Match route pattern to rate limit tier */
function getRateLimitTier(
  pathname: string,
  method: string
): RateLimitTier | null {
  // POST /api/rooms (create room)
  if (pathname === '/api/rooms' && method === 'POST') {
    return 'createRoom'
  }

  // Routes under /api/rooms/[code]/...
  const actionMatch = pathname.match(/^\/api\/rooms\/[^/]+\/([^/]+)$/)
  if (actionMatch) {
    const action = actionMatch[1]

    if (method === 'POST') {
      if (action === 'join' || action === 'start' || action === 'bot') {
        return 'joinOrManage'
      }
      if (action === 'roll' || action === 'score' || action === 'skip') {
        return 'gameAction'
      }
    }
  }

  // GET /api/rooms/* (any read)
  if (pathname.startsWith('/api/rooms') && method === 'GET') {
    return 'read'
  }

  return null
}

function getClientIp(request: NextRequest): string {
  // Prefer platform-set headers (cannot be spoofed by clients on Vercel/Cloudflare)
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  // x-forwarded-for can be spoofed without a trusted proxy — use last entry
  // (rightmost is the one added by the closest proxy, hardest to spoof)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map(s => s.trim())
    return parts[parts.length - 1]
  }

  return '127.0.0.1'
}

function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set(
    'X-RateLimit-Reset',
    String(Math.ceil(result.resetAt / 1000))
  )
  return response
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Request logging for API routes
  if (pathname.startsWith('/api/')) {
    const start = Date.now()
    const method = request.method

    const logRequest = () => {
      const duration = Date.now() - start
      logger.info('API request', { method, path: pathname, duration })
    }

    const originalNext = () => {
      const response = NextResponse.next()
      logRequest()
      return response
    }

    // For non-rooms API routes, log and pass through
    if (!pathname.startsWith('/api/rooms')) {
      return originalNext()
    }

    // Rate limiting for API routes
    const tier = getRateLimitTier(pathname, method)

    if (tier) {
      const ip = getClientIp(request)
      const key = `${ip}:${tier}`
      const result = rateLimiters[tier].check(key)

      if (!result.allowed) {
        const response = NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message:
                'Too many requests. Please slow down and try again shortly.',
            },
          },
          { status: 429 }
        )
        logRequest()
        return addRateLimitHeaders(response, result)
      }

      const response = NextResponse.next()
      logRequest()
      return addRateLimitHeaders(response, result)
    }

    // API route without a matching tier -- pass through
    return originalNext()
  }

  // i18n middleware for page routes
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/', '/(ru|en)/:path*', '/api/:path*'],
}
