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

console.log('Refreshing materialized view...')
const { error } = await supabase.rpc('refresh_materialized_views')

if (error) {
  console.log('Error:', error.message)
} else {
  console.log('Success! Materialized views refreshed.')
  
  // Check TP-5 again
  const { data } = await supabase
    .from('mv_package_readiness')
    .select('package_name, total_components, avg_percent_complete')
    .eq('package_name', 'TP-5')
    .single()
  
  if (data) {
    console.log('\nTP-5 stats:')
    console.log('  Components: ' + data.total_components)
    console.log('  Progress: ' + data.avg_percent_complete + '%')
  }
}
