// Call refresh_mv_drawing_progress function
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

  const { data, error } = await supabase.rpc('refresh_mv_drawing_progress')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('✅ Materialized view refreshed successfully!\n')

  // Verify TP drawings are now in the view
  const { data: drawings } = await supabase
    .from('drawings')
    .select('id, drawing_no_raw')
    .in('drawing_no_raw', ['TP-DWG-001', 'TP-DWG-002'])

  if (drawings && drawings.length > 0) {
    const drawingIds = drawings.map(d => d.id)

    const { data: progressData } = await supabase
      .from('mv_drawing_progress')
      .select('*')
      .in('drawing_id', drawingIds)

    console.log('TP Drawings in mv_drawing_progress:')
    progressData?.forEach(p => {
      const drawing = drawings.find(d => d.id === p.drawing_id)
      console.log(`\n  📋 ${drawing?.drawing_no_raw || 'Unknown'}`)
      console.log(`     Total components: ${p.total_components}`)
      console.log(`     Completed: ${p.completed_components}`)
      console.log(`     Avg %: ${p.avg_percent_complete}%`)
    })
  }
}

main().catch(console.error)
