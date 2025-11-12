#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file manually
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

// Query to find all foreign keys referencing the users table
const query = `
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
`

console.log('🔍 Finding all foreign keys referencing users table...\n')

const { data, error } = await supabase.rpc('exec_sql', { sql: query })

if (error) {
  // Try direct query if RPC doesn't exist
  console.log('Querying via Supabase client...')

  const { data: fks, error: err } = await supabase
    .from('information_schema.table_constraints')
    .select('*')

  console.log('data:', fks)
  console.log('error:', err)
} else {
  console.log('Foreign keys found:')
  console.log(JSON.stringify(data, null, 2))
}
