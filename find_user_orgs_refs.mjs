import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Query for policies on invitations table
const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT policyname, pg_get_expr(polqual, polrelid) as using_clause, pg_get_expr(polwithcheck, polrelid) as check_clause
    FROM pg_policy
    WHERE polrelid = 'invitations'::regclass;
  `
})

console.log('Policies:', policies)
console.log('Error:', policyError)
