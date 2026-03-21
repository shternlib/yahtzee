import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import {
  rateLimiters,
  type RateLimitResult,
  type RateLimitTier,
} from './lib/utils/rate-limit'

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
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1'
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

  // Rate limiting for API routes
  if (pathname.startsWith('/api/rooms')) {
    const tier = getRateLimitTier(pathname, request.method)

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
        return addRateLimitHeaders(response, result)
      }

      const response = NextResponse.next()
      return addRateLimitHeaders(response, result)
    }

    // API route without a matching tier — pass through
    return NextResponse.next()
  }

  // i18n middleware for page routes
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/', '/(ru|en)/:path*', '/api/rooms/:path*'],
}
