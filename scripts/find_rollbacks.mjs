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

const projectId = 'e34ca1d2-b740-4294-b17c-96fdbc187058'
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

// Get all milestone events from last 7 days where delta_mh is negative (rollbacks)
const { data: events, error: eventsError } = await supabase
  .from('milestone_events')
  .select('component_id, milestone_name, value, previous_value, delta_mh, category, created_at')
  .lt('delta_mh', 0)
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })

if (eventsError) { console.error(eventsError); process.exit(1) }

// Get component details separately
const componentIds = [...new Set(events.map(e => e.component_id))]

const { data: components, error: compError } = await supabase
  .from('components')
  .select('id, attributes, component_type, project_id')
  .in('id', componentIds)
  .eq('project_id', projectId)

if (compError) { console.error(compError); process.exit(1) }

const compMap = new Map(components.map(c => [c.id, c]))

console.log('=== Components with Rollbacks (Negative Delta) in Last 7 Days ===\n')

for (const e of events) {
  const comp = compMap.get(e.component_id)
  if (!comp) continue // Skip if not in this project

  const tagNumber = comp.attributes?.tag_number || comp.id.substring(0, 8)

  console.log('Component: ' + tagNumber + ' (' + comp.component_type + ')')
  console.log('  Milestone: ' + e.milestone_name + ' (category: ' + e.category + ')')
  console.log('  Value changed: ' + e.previous_value + ' -> ' + e.value)
  console.log('  Delta MH: ' + e.delta_mh)
  console.log('  Date: ' + e.created_at)
  console.log()
}

const count = events.filter(e => compMap.has(e.component_id)).length
console.log('Total rollback events: ' + count)
