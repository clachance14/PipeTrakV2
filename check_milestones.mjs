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

// Find aggregate threaded pipe components
const { data, error } = await supabase
  .from('components')
  .select('id, identity_key, current_milestones, percent_complete, attributes')
  .eq('component_type', 'threaded_pipe')
  .limit(5)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Aggregate Threaded Pipe Components:')
  data.forEach(c => {
    const isAggregate = c.identity_key?.pipe_id?.endsWith('-AGG')
    console.log('\n---')
    console.log('ID:', c.id)
    console.log('Pipe ID:', c.identity_key?.pipe_id)
    console.log('Is Aggregate:', isAggregate)
    console.log('Total LF:', c.attributes?.total_linear_feet)
    console.log('Percent Complete:', c.percent_complete)
    console.log('Current Milestones:', JSON.stringify(c.current_milestones, null, 2))
  })
}
