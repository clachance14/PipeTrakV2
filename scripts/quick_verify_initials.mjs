// Quick verification: Show sample activities with user_initials
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

const { data, error } = await supabase
  .from('vw_recent_activity')
  .select('user_initials, description')
  .limit(5)

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log('\n📋 Sample Activity Feed (First 5 Items):\n')
data?.forEach((item, i) => {
  console.log(`${i + 1}. [${item.user_initials}] ${item.description.substring(0, 80)}...`)
})
console.log('')
