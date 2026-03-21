import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server operations')
}
const supabaseServiceKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Server-side Supabase client for API routes */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}
