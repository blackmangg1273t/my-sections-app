import { createClient } from '@supabase/supabase-js'

// Public anon/publishable key — safe for client-side use, access is
// controlled by Row Level Security policies on the database.
const SUPABASE_URL = 'https://wtnpmvkmlvokvqtxcpty.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_V38pXj-iuI_k6q5KzsipCg_3r_jZehH'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

export type Profile = {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  username: string
  content: string
  created_at: string
}
