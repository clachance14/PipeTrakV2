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

console.log('=== Checking field_welds table ===')
const { data: welds, error: weldsError } = await supabase
  .from('field_welds')
  .select('*')
  .limit(1)

if (weldsError) {
  console.error('field_welds error:', weldsError)
} else {
  console.log('field_welds sample columns:', welds[0] ? Object.keys(welds[0]) : 'NO DATA')
}

console.log('\n=== Checking components table ===')
const { data: components, error: compError } = await supabase
  .from('components')
  .select('*')
  .eq('component_type', 'field_weld')
  .limit(1)

if (compError) {
  console.error('components error:', compError)
} else {
  console.log('components sample columns:', components[0] ? Object.keys(components[0]) : 'NO DATA')
  if (components[0]) {
    console.log('Sample component:', components[0])
  }
}

console.log('\n=== Testing join query ===')
const { data: joinTest, error: joinError } = await supabase
  .from('field_welds')
  .select(`
    id,
    weld_type,
    component_id,
    components(id, component_type, drawing_id)
  `)
  .limit(1)

if (joinError) {
  console.error('Join error:', joinError)
} else {
  console.log('Join successful:', joinTest)
}

console.log('\n=== Counting field welds ===')
const { count } = await supabase
  .from('field_welds')
  .select('*', { count: 'exact', head: true })

console.log('Total field welds:', count)
