// Check existing threaded_pipe components to see identity_key structure
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

async function main() {
  console.log('=== Checking Existing Threaded Pipe Components ===')

  const { data: components, error } = await supabase
    .from('components')
    .select('id, component_type, identity_key, attributes')
    .eq('component_type', 'threaded_pipe')
    .limit(5)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (!components || components.length === 0) {
    console.log('No threaded_pipe components found in database')
    return
  }

  console.log(`Found ${components.length} threaded_pipe components:`)
  components.forEach(c => {
    console.log('\nComponent ID:', c.id)
    console.log('Identity Key:', JSON.stringify(c.identity_key, null, 2))
    console.log('Attributes:', JSON.stringify(c.attributes, null, 2))
  })
}

main().catch(console.error)
