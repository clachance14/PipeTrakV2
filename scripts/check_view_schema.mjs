// Check the actual schema of mv_drawing_progress
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

console.log('=== Checking mv_drawing_progress Schema ===\n')

// Try to select all columns
const { data, error } = await supabase
  .from('mv_drawing_progress')
  .select('*')
  .limit(1)

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

if (data && data.length > 0) {
  console.log('Columns in mv_drawing_progress:')
  console.log(Object.keys(data[0]))
  console.log('\nSample row:')
  console.log(JSON.stringify(data[0], null, 2))
} else {
  console.log('No data in mv_drawing_progress')
  console.log('Trying to get columns from information_schema...')

  // Use raw SQL query to check the view definition
  const { data: schemaData, error: schemaError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'mv_drawing_progress'
        ORDER BY ordinal_position
      `
    })
    .then(
      (result) => result,
      async (err) => {
        // Try alternative: query the view directly with select *
        console.log('Querying view structure...')
        const result = await supabase
          .from('mv_drawing_progress')
          .select('*')
          .limit(0)
        return result
      }
    )

  if (schemaError) {
    console.error('Schema error:', schemaError.message)
  }
}

// Also check what the frontend expects
console.log('\n=== Checking Frontend Query ===')
const { data: frontendData, error: frontendError } = await supabase
  .from('mv_drawing_progress')
  .select('*')
  .limit(5)

if (frontendError) {
  console.error('Frontend query error:', frontendError.message)
} else {
  console.log(`Found ${frontendData?.length || 0} rows`)
  if (frontendData && frontendData.length > 0) {
    console.log('Sample:')
    console.log(JSON.stringify(frontendData[0], null, 2))
  }
}
