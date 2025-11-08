// Check mv_drawing_progress view for TP drawings
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
  console.log('=== Checking Drawing Progress View ===\n')

  // Get TP drawings from drawings table
  const { data: drawings } = await supabase
    .from('drawings')
    .select('*')
    .in('drawing_no_raw', ['TP-DWG-001', 'TP-DWG-002'])

  console.log('TP Drawings from drawings table:')
  drawings?.forEach(d => {
    console.log(`  - ${d.drawing_no_raw} (ID: ${d.id}, Retired: ${d.is_retired})`)
  })

  // Check if they're in mv_drawing_progress
  if (drawings && drawings.length > 0) {
    const drawingIds = drawings.map(d => d.id)

    const { data: progressData } = await supabase
      .from('mv_drawing_progress')
      .select('*')
      .in('drawing_id', drawingIds)

    console.log('\n\nTP Drawings in mv_drawing_progress view:')
    if (progressData && progressData.length > 0) {
      progressData.forEach(p => {
        const drawing = drawings.find(d => d.id === p.drawing_id)
        console.log(`  - ${drawing?.drawing_no_raw || p.drawing_id}`)
        console.log(`    Total components: ${p.total_components}`)
        console.log(`    Completed: ${p.completed_components}`)
        console.log(`    Avg %: ${p.avg_percent_complete}`)
      })
    } else {
      console.log('  ⚠️  NO DATA - Materialized view needs refresh!')
    }
  }

  // Check if materialized view needs refresh
  console.log('\n\n=== Refresh Materialized View ===')
  console.log('Run this SQL to refresh the view:')
  console.log('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_drawing_progress;')
}

main().catch(console.error)
