import { createBrowserClient } from '@supabase/ssr'

// Fallback to hardcoded values if env vars are not set
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rtuodkczrlkxwwtaxwrr.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dW9ka2N6cmxreHd3dGF4d3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTc0ODAsImV4cCI6MjA4NzE3MzQ4MH0.KlJ70ysYG78x1hwOTmePW53t_IEeLqC_PzGiBozh2Ug'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
