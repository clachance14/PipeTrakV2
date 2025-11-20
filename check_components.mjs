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

// Count all components by type
const { data: typeCount, error: typeError } = await supabase
  .rpc('get_component_type_counts')
  .catch(() => null)

// Try direct query instead
const { data, error } = await supabase
  .from('components')
  .select('component_type, identity_key, current_milestones, percent_complete, attributes')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Recent Components:')
  data.forEach(c => {
    console.log('\n---')
    console.log('Type:', c.component_type)
    console.log('Identity:', JSON.stringify(c.identity_key))
    console.log('Percent:', c.percent_complete)
    console.log('Milestones:', JSON.stringify(c.current_milestones, null, 2))
  })
}
