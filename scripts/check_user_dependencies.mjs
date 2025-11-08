// Check what data is associated with the user
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

const userId = '1b093e7b-2cfc-41a0-be9b-72f07c8a0988'
const orgId = 'fd78f604-bc82-478c-8330-7d016619eb6e'

console.log('=== Checking User Dependencies ===\n')

// Check organization
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .select('id, name')
  .eq('id', orgId)
  .maybeSingle()

if (org) {
  console.log(`Organization: ${org.name} (${org.id})`)

  // Check how many users in this org
  const { data: orgUsers, count } = await supabase
    .from('users')
    .select('id, email', { count: 'exact' })
    .eq('organization_id', orgId)

  console.log(`  → ${count} user(s) in organization`)
  if (orgUsers) {
    orgUsers.forEach(u => console.log(`     - ${u.email}`))
  }

  // Check projects in this org
  const { data: projects, count: projectCount } = await supabase
    .from('projects')
    .select('id, name', { count: 'exact' })
    .eq('organization_id', orgId)

  console.log(`  → ${projectCount} project(s)`)
  if (projects) {
    projects.forEach(p => console.log(`     - ${p.name}`))
  }
}

console.log('\n=== Deletion Strategy ===\n')
console.log('Since there is data associated with this user, we need to:')
console.log('1. Delete from public.users first (this will soft-delete)')
console.log('2. Permanently delete the organization and all its data')
console.log('3. Delete from auth.users')
console.log('\nOr simply:')
console.log('1. Hard delete from public.users (DELETE, not soft-delete)')
console.log('2. Let cascading deletes handle the rest')
console.log('3. Delete from auth.users last')
