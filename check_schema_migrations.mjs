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
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'supabase_migrations' }
})

// Direct SQL query to check schema_migrations
const { data, error } = await supabase
  .rpc('exec_sql', { 
    sql: "SELECT version FROM supabase_migrations.schema_migrations WHERE version >= '00097' AND version <= '00114' ORDER BY version" 
  })
  .catch(async () => {
    // Fallback: try querying public schema to list functions
    const { data: funcs } = await supabase
      .rpc('exec_sql', {
        sql: `SELECT proname FROM pg_proc WHERE proname LIKE '%threaded%' OR proname = 'calculate_component_percent'`
      })
      .catch(() => ({ data: null }))
    
    return { data: funcs, error: 'schema_migrations not accessible' }
  })

console.log('Schema migrations query result:')
console.log('Data:', data)
console.log('Error:', error)

// Check if the trigger function handles aggregate threaded_pipe
const { data: triggerData, error: triggerError } = await supabase
  .rpc('exec_sql', {
    sql: `SELECT prosrc FROM pg_proc WHERE proname = 'update_component_percent_on_milestone_change'`
  }).catch(() => ({ data: null, error: 'Cannot query pg_proc' }))

console.log('\nTrigger function source check:')
console.log('Error:', triggerError)
