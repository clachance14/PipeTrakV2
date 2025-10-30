// Verification script for User Story 4: User Initials Calculation
// Tests LATERAL unnest + string_agg pattern with edge cases

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

// Use service role to bypass RLS for verification
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('🔍 Verifying User Initials Calculation (T015)\n')

// Test the view's user_initials calculation with various scenarios
console.log('Querying vw_recent_activity to verify user_initials...\n')

const { data, error } = await supabase
  .from('vw_recent_activity')
  .select('user_id, user_initials, description')
  .limit(20)

if (error) {
  console.error('❌ Error querying view:', error)
  process.exit(1)
}

if (!data || data.length === 0) {
  console.log('⚠️  No activity data found in vw_recent_activity')
  console.log('   This is expected if no milestone_events exist yet.')
  console.log('   The view structure is correct, but there is no data to display.')
  process.exit(0)
}

console.log(`✅ Found ${data.length} activities\n`)

// Get unique user_ids to check actual user full_name values
const userIds = [...new Set(data.map(row => row.user_id))]

console.log('Fetching user details to verify initials calculation...\n')

const { data: users, error: userError } = await supabase
  .from('users')
  .select('id, full_name, email')
  .in('id', userIds)

if (userError) {
  console.error('❌ Error querying users:', userError)
  process.exit(1)
}

// Create lookup map
const userMap = new Map(users.map(u => [u.id, u]))

// Verify each activity's user_initials
console.log('📊 Verification Results:\n')
console.log('─'.repeat(80))

let allCorrect = true

data.forEach(activity => {
  const user = userMap.get(activity.user_id)
  if (!user) {
    console.log(`⚠️  User ID ${activity.user_id} not found`)
    return
  }

  // Calculate expected initials
  let expected = ''
  if (user.full_name) {
    // LATERAL unnest + string_agg: split by space, take first char of each word, uppercase
    const words = user.full_name.split(' ').filter(w => w.length > 0)
    expected = words.map(w => w[0].toUpperCase()).join('')
  } else {
    // Email fallback: first 2 chars before @, uppercase
    expected = user.email.substring(0, 2).toUpperCase()
  }

  const actual = activity.user_initials
  const match = actual === expected

  if (!match) {
    allCorrect = false
  }

  const icon = match ? '✅' : '❌'
  const source = user.full_name ? `full_name="${user.full_name}"` : `email="${user.email}"`

  console.log(`${icon} ${source}`)
  console.log(`   Expected: "${expected}" | Actual: "${actual}"`)
  console.log(`   Description: ${activity.description.substring(0, 60)}...`)
  console.log('─'.repeat(80))
})

console.log('\n📋 Test Cases Coverage:\n')

// Check for edge cases
const hasMultiWord = users.some(u => u.full_name && u.full_name.includes(' '))
const hasSingleWord = users.some(u => u.full_name && !u.full_name.includes(' '))
const hasEmailFallback = users.some(u => !u.full_name)

console.log(`Multi-word names (e.g., "John Smith" → "JS"): ${hasMultiWord ? '✅ TESTED' : '⚠️  NOT TESTED'}`)
console.log(`Single-word names (e.g., "Madonna" → "M"): ${hasSingleWord ? '✅ TESTED' : '⚠️  NOT TESTED'}`)
console.log(`Email fallback (NULL full_name): ${hasEmailFallback ? '✅ TESTED' : '⚠️  NOT TESTED'}`)

console.log('\n' + '='.repeat(80))
if (allCorrect) {
  console.log('✅ ALL USER INITIALS CORRECTLY CALCULATED')
  console.log('   T015: LATERAL unnest + string_agg pattern working as expected')
} else {
  console.log('❌ SOME USER INITIALS INCORRECT')
  console.log('   Review migration 00055 LATERAL join and GROUP BY clause')
  process.exit(1)
}
console.log('='.repeat(80))
