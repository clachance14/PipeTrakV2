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

console.log('🔍 Current users in database:\n')

const { data: users, error, count } = await supabase
  .from('users')
  .select('email, full_name, role, organization_id, is_demo_user, is_super_admin', { count: 'exact' })
  .order('created_at', { ascending: true })

if (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}

console.log(`Total users: ${count}\n`)

users?.forEach((user, index) => {
  const badges = []
  if (user.is_super_admin) badges.push('SUPER_ADMIN')
  if (user.is_demo_user) badges.push('DEMO')
  if (!user.organization_id) badges.push('NO_ORG')

  const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : ''

  console.log(`${index + 1}. ${user.email}`)
  console.log(`   Name: ${user.full_name}`)
  console.log(`   Role: ${user.role || 'none'}`)
  console.log(`   Org: ${user.organization_id ? user.organization_id.substring(0, 8) + '...' : 'none'}${badgeStr}`)
  console.log()
})
