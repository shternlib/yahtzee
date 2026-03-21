import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/utils/logger'

// Read version at module level to avoid repeated file reads
const APP_VERSION = process.env.npm_package_version ?? '0.1.0'

export async function GET() {
  const timestamp = new Date().toISOString()
  let status: 'ok' | 'degraded' = 'ok'

  // Check Supabase connectivity
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { error } = await supabase.rpc('', {}).maybeSingle()
      // A "function not found" error still proves connectivity.
      // A network/auth error means the service is unreachable.
      if (error && error.message?.includes('ECONNREFUSED')) {
        status = 'degraded'
        logger.warn('Health check: Supabase connectivity failed', {
          error: error.message,
        })
      }
    } catch (err) {
      status = 'degraded'
      logger.warn('Health check: Supabase connectivity failed', {
        error: String(err),
      })
    }
  } else {
    status = 'degraded'
    logger.warn('Health check: Supabase env vars not configured')
  }

  return NextResponse.json(
    { status, timestamp, version: APP_VERSION },
    { status: 200 }
  )
}
