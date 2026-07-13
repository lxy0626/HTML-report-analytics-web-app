import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.',
  )
}

// Safe to expose: this is the public anon key, not a secret — access is enforced
// entirely by the Row Level Security policies in supabase/schema.sql.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const REPORTS_BUCKET = 'reports-raw'
