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

// Service role bypasses RLS to see all demo users
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('🔍 Checking for demo users...\n')

const { data, error, count } = await supabase
  .from('users')
  .select('id, email, full_name, is_demo_user, demo_expires_at, created_at', { count: 'exact' })
  .eq('is_demo_user', true)
  .order('created_at', { ascending: false })

if (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}

console.log(`📊 Found ${count} demo user(s)\n`)

if (data && data.length > 0) {
  data.forEach((user, index) => {
    const expiresAt = new Date(user.demo_expires_at)
    const createdAt = new Date(user.created_at)
    const now = new Date()
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    
    console.log(`Demo User #${index + 1}:`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Name: ${user.full_name}`)
    console.log(`  Created: ${createdAt.toLocaleString()}`)
    console.log(`  Expires: ${expiresAt.toLocaleString()}`)
    console.log(`  Days Remaining: ${daysRemaining}`)
    console.log(`  Status: ${daysRemaining > 0 ? '✅ Active' : '⚠️ Expired'}`)
    console.log()
  })
} else {
  console.log('No demo users found.')
}
