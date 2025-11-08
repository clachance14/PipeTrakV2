// Refresh mv_drawing_progress materialized view
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
  console.log('=== Refreshing mv_drawing_progress ===\n')

  const { error } = await supabase.rpc('refresh_drawing_progress')

  if (error) {
    console.error('Error refreshing view:', error)
    console.log('\nTrying direct SQL approach...')

    // Try with direct SQL
    const { error: sqlError } = await supabase
      .from('mv_drawing_progress')
      .select('count')
      .limit(0) // Just trigger connection

    console.log('Note: May need to run SQL directly in Supabase dashboard:')
    console.log('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_drawing_progress;')
    return
  }

  console.log('✅ Materialized view refreshed successfully!')

  // Verify TP drawings are now in the view
  const { data: tpData } = await supabase
    .from('mv_drawing_progress')
    .select('*')
    .or('drawing_no_raw.eq.TP-DWG-001,drawing_no_raw.eq.TP-DWG-002')

  if (tpData && tpData.length > 0) {
    console.log('\n✅ TP Drawings now in view:')
    tpData.forEach(d => {
      console.log(`  - Drawing ID: ${d.drawing_id}`)
      console.log(`    Total components: ${d.total_components}`)
    })
  }
}

main().catch(console.error)
