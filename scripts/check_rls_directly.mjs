// Check RLS policies directly using raw SQL
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('=== Checking Organizations RLS Policies ===\n')

// Test 1: Can the new user insert an organization?
const userId = '990c0a84-7b3e-4b53-a88e-03f64c9b8121'
const email = 'clachance@ics.ac'

console.log(`Testing as user: ${email}\n`)

// Test with service role first (should always work)
console.log('1. Testing INSERT with service role (bypasses RLS)...')
const { data: testOrg, error: serviceError } = await supabaseAdmin
  .from('organizations')
  .insert({ name: 'Test Org - Service Role' })
  .select()
  .single()

if (serviceError) {
  console.error('❌ Service role INSERT failed:', serviceError)
} else {
  console.log('✅ Service role can INSERT')
  // Clean up
  await supabaseAdmin.from('organizations').delete().eq('id', testOrg.id)
}

// Test 2: Check the actual policies
console.log('\n2. Querying pg_policies for organizations table...')

const query = `
  SELECT
    policyname,
    cmd,
    roles::text[],
    CASE
      WHEN qual IS NOT NULL THEN pg_get_expr(qual, 'organizations'::regclass)
      ELSE 'NO QUAL'
    END as using_expression,
    CASE
      WHEN with_check IS NOT NULL THEN pg_get_expr(with_check, 'organizations'::regclass)
      ELSE 'NO CHECK'
    END as with_check_expression
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organizations'
  ORDER BY cmd, policyname;
`

// We need to use a custom query - let's try via service role
const { data: policies, error: policyError } = await supabaseAdmin
  .from('organizations')
  .select('*')
  .limit(0) // Get schema only

console.log('\nNote: Cannot query pg_policies directly via Supabase client.')
console.log('Recommended: Check policies in Supabase Dashboard')
console.log('  → Go to: https://supabase.com/dashboard/project/ipdznzzinfnomfwoebpp')
console.log('  → Database > Tables > organizations > Policies')
console.log('\nOr manually fix by creating the user\'s organization with service role...')

console.log('\n3. Manually creating organization for user...')
const { data: newOrg, error: createError } = await supabaseAdmin
  .from('organizations')
  .insert({ name: 'Cory LaChance Org' })
  .select()
  .single()

if (createError) {
  console.error('❌ Error creating organization:', createError)
} else {
  console.log('✅ Organization created:', newOrg.name, `(${newOrg.id})`)

  // Update user with org_id and role
  console.log('\n4. Updating user with organization_id and role...')
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ organization_id: newOrg.id, role: 'owner' })
    .eq('id', userId)

  if (updateError) {
    console.error('❌ Error updating user:', updateError)
  } else {
    console.log('✅ User updated with organization')
    console.log('\n=== Setup Complete ===')
    console.log(`User ${email} can now log in at http://localhost:5173/login`)
  }
}
