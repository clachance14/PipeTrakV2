// Check current RLS policies on organizations table
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
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

console.log('=== Checking Organizations Table RLS Policies ===\n')

// Query to check RLS policies
const { data, error } = await supabase
  .rpc('exec_sql', {
    sql: `
      SELECT
        policyname,
        cmd,
        roles,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'organizations'
      ORDER BY cmd, policyname;
    `
  })
  .single()

if (error) {
  console.log('RPC function not available, trying direct query via service role...\n')

  // Alternative: Check if RLS is enabled
  const { data: tables, error: tableError } = await supabase
    .from('organizations')
    .select('*')
    .limit(1)

  if (tableError) {
    console.error('Error querying organizations:', tableError)
  } else {
    console.log('✅ Service role can access organizations table')
    console.log('\nThe issue is likely:')
    console.log('1. Migration 00007_fix_organizations_insert_policy.sql was not applied')
    console.log('2. Or the policy exists but registration code is using wrong approach')
  }

  console.log('\n=== Solution ===\n')
  console.log('Run this command to apply all pending migrations:')
  console.log('  supabase db push --linked')
  console.log('\nOr verify the INSERT policy exists:')
  console.log('  Go to Supabase Dashboard > Database > organizations table > Policies')
  console.log('  Look for: "Authenticated users can create organizations"')
} else {
  console.log('Current RLS policies on organizations table:')
  console.log(data)
}
