/**
 * Fix N-26K02-SPOOL1 data corrupted by migration bug
 *
 * Problem: Migration bug set milestone values to 1 instead of 100,
 * causing erroneous rollback events to be recorded.
 *
 * Fix:
 * 1. Update current_milestones to set Receive=100 and Erect=100
 * 2. Delete the erroneous milestone events from Dec 4 (100→1)
 * 3. The delta_mh will be correctly calculated from remaining events
 */

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

const componentId = '30f78ae4-b114-490c-bb09-75125924d67f'

console.log('=== Fixing N-26K02-SPOOL1 Data ===\n')

// Step 1: Show current state
console.log('Step 1: Current state')
const { data: currentState, error: currentError } = await supabase
  .from('components')
  .select('id, attributes, current_milestones, percent_complete')
  .eq('id', componentId)
  .single()

if (currentError) {
  console.error('Error fetching current state:', currentError)
  process.exit(1)
}

console.log('  Current milestones:', JSON.stringify(currentState.current_milestones))
console.log('  Percent complete:', currentState.percent_complete)
console.log()

// Step 2: Delete erroneous milestone events from Dec 4
console.log('Step 2: Deleting erroneous milestone events (100→1 rollbacks)')

const { data: eventsToDelete, error: fetchEventsError } = await supabase
  .from('milestone_events')
  .select('id, milestone_name, value, previous_value, created_at')
  .eq('component_id', componentId)
  .eq('previous_value', 100)
  .eq('value', 1)

if (fetchEventsError) {
  console.error('Error fetching events to delete:', fetchEventsError)
  process.exit(1)
}

console.log('  Events to delete:')
for (const event of eventsToDelete) {
  console.log(`    - ${event.milestone_name}: ${event.previous_value} -> ${event.value} (${event.created_at})`)
}

const eventIds = eventsToDelete.map(e => e.id)

if (eventIds.length > 0) {
  const { error: deleteError } = await supabase
    .from('milestone_events')
    .delete()
    .in('id', eventIds)

  if (deleteError) {
    console.error('Error deleting events:', deleteError)
    process.exit(1)
  }
  console.log(`  Deleted ${eventIds.length} erroneous events`)
} else {
  console.log('  No erroneous events found to delete')
}
console.log()

// Step 3: Update current_milestones to correct values
console.log('Step 3: Updating current_milestones to correct values')

const { error: updateError } = await supabase
  .from('components')
  .update({
    current_milestones: {
      "Receive": 100,
      "Erect": 100,
      "Connect": 0,
      "Punch": 0,
      "Test": 0,
      "Restore": 0
    }
  })
  .eq('id', componentId)

if (updateError) {
  console.error('Error updating milestones:', updateError)
  process.exit(1)
}
console.log('  Updated current_milestones: Receive=100, Erect=100')
console.log()

// Step 4: Trigger percent_complete recalculation by calling RPC
console.log('Step 4: Recalculating percent_complete')

// We need to trigger the calculate_component_percent function
// The easiest way is to update a milestone which triggers the recalculation
const { error: recalcError } = await supabase.rpc('update_component_milestone', {
  p_component_id: componentId,
  p_milestone_name: 'Receive',
  p_new_value: 100
})

if (recalcError) {
  console.error('Error recalculating:', recalcError)
  // Not fatal - the percent_complete trigger should fire on next update
}
console.log('  Triggered percent_complete recalculation')
console.log()

// Step 5: Verify final state
console.log('Step 5: Verifying final state')
const { data: finalState, error: finalError } = await supabase
  .from('components')
  .select('id, attributes, current_milestones, percent_complete')
  .eq('id', componentId)
  .single()

if (finalError) {
  console.error('Error fetching final state:', finalError)
  process.exit(1)
}

console.log('  Final milestones:', JSON.stringify(finalState.current_milestones))
console.log('  Final percent_complete:', finalState.percent_complete)
console.log()

// Step 6: Verify milestone events are now correct
console.log('Step 6: Final milestone events for this component')
const { data: finalEvents, error: eventsError } = await supabase
  .from('milestone_events')
  .select('milestone_name, value, previous_value, delta_mh, category, created_at')
  .eq('component_id', componentId)
  .order('created_at', { ascending: true })

if (eventsError) {
  console.error('Error fetching final events:', eventsError)
  process.exit(1)
}

for (const event of finalEvents) {
  console.log(`  ${event.created_at}: ${event.milestone_name} ${event.previous_value || 0} -> ${event.value} (delta_mh: ${event.delta_mh})`)
}

console.log('\n=== Fix Complete ===')
