// Check recent signups to understand what happened
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

// Use service role to bypass RLS and see all users
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('=== Recent Signup Investigation ===\n')

// Get recent auth users created in last hour
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

console.log('Checking for users created after:', oneHourAgo)
console.log('')

const { data: users, error } = await supabase
  .from('users')
  .select('id, email, created_at')
  .gte('created_at', oneHourAgo)
  .order('created_at', { ascending: false })

if (error) {
  console.error('Error fetching users:', error)
} else {
  console.log(`Found ${users.length} recent signups:\n`)

  users.forEach((user, i) => {
    console.log(`${i + 1}. Email: ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Created: ${user.created_at}`)
    console.log('')
  })
}

console.log('=== Checking Supabase SMTP Configuration ===\n')
console.log('The SMTP configuration is stored in Supabase dashboard settings.')
console.log('If emails are not appearing in Resend logs, it means:')
console.log('  1. SMTP settings were not saved properly in dashboard')
console.log('  2. SMTP settings need to be re-enabled')
console.log('  3. There might be a rate limit or temporary issue')
console.log('\nRecommendation:')
console.log('  → Go back to Supabase Dashboard > Settings > Auth')
console.log('  → Scroll to SMTP Settings')
console.log('  → Verify "Enable Custom SMTP" is toggled ON')
console.log('  → Click Save again to ensure changes persist')
