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

// Get full details of the spool
const { data, error } = await supabase
  .from('components')
  .select('id, attributes, component_type, current_milestones, percent_complete, drawing_id')
  .eq('id', '30f78ae4-b114-490c-bb09-75125924d67f')
  .single()

if (error) { console.error(error); process.exit(1) }

console.log('=== Spool Details ===')
console.log()
console.log('ID: ' + data.id)
console.log('Spool Number: ' + (data.attributes?.spool_number || 'N/A'))
console.log('Tag Number: ' + (data.attributes?.tag_number || 'N/A'))
console.log('Drawing ID: ' + data.drawing_id)
console.log('Type: ' + data.component_type)
console.log('Percent Complete: ' + data.percent_complete)
console.log()
console.log('Attributes:')
console.log(JSON.stringify(data.attributes, null, 2))
console.log()
console.log('Current Milestones:')
console.log(JSON.stringify(data.current_milestones, null, 2))

// Get drawing info
if (data.drawing_id) {
  const { data: drawing, error: drawErr } = await supabase
    .from('drawings')
    .select('id, drawing_number, revision')
    .eq('id', data.drawing_id)
    .single()

  if (drawing) {
    console.log()
    console.log('Drawing: ' + drawing.drawing_number + ' Rev ' + drawing.revision)
  }
}
