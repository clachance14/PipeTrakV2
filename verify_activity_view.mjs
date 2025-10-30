// verify_activity_view.mjs
// Verify vw_recent_activity view exists and is queryable
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Testing vw_recent_activity view...\n')

// Query vw_recent_activity to verify it exists
const { data, error, count } = await supabase
  .from('vw_recent_activity')
  .select('*', { count: 'exact' })
  .limit(1)

console.log('View queryable:', error === null)
console.log('Error:', error)
console.log('Count:', count)
console.log('Sample data:', data)

// Test with common query pattern (most recent 5 activities)
const { data: testData, error: testError } = await supabase
  .from('vw_recent_activity')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(5)

console.log('\nTest query (with project filter):')
console.log('Query successful:', testError === null)
console.log('Test error:', testError)
console.log('Test results count:', testData?.length ?? 0)

if (error === null) {
  console.log('\n✅ View vw_recent_activity is successfully created and queryable!')
} else {
  console.log('\n❌ View verification failed')
}
