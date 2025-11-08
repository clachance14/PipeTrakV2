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

console.log('🔍 Verifying demo user cleanup...\n')

// Check public.users
const { data: users, count: userCount } = await supabase
  .from('users')
  .select('id', { count: 'exact', head: true })
  .eq('is_demo_user', true)

console.log(`✅ Demo users in public.users: ${userCount || 0}`)

// Check organizations with "Demo -" prefix
const { data: orgs, count: orgCount } = await supabase
  .from('organizations')
  .select('id, name', { count: 'exact' })
  .like('name', 'Demo -%')

console.log(`✅ Demo organizations: ${orgCount || 0}`)
if (orgs && orgs.length > 0) {
  orgs.forEach(org => console.log(`   - ${org.name} (${org.id})`))
}

// Check projects named "PipeTrak Demo Project"
const { data: projects, count: projectCount } = await supabase
  .from('projects')
  .select('id, name', { count: 'exact' })
  .eq('name', 'PipeTrak Demo Project')

console.log(`✅ Demo projects: ${projectCount || 0}`)

// Check rate limit events for demo signups
const { count: rateLimitCount } = await supabase
  .from('rate_limit_events')
  .select('id', { count: 'exact', head: true })
  .eq('event_type', 'demo_signup')

console.log(`✅ Rate limit events (demo_signup): ${rateLimitCount || 0}`)

console.log('\n✅ Verification complete!')
