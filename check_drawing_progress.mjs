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

// First, find all projects
const { data: projects, error: projError } = await supabase
  .from('projects')
  .select('id, name')

if (projError) {
  console.error('Error fetching projects:', projError)
  process.exit(1)
}

console.log('Found projects:')
projects.forEach(p => {
  console.log('  ' + p.name + ' (' + p.id + ')')
})

// Look for project with 6074 in name
const darkKnight = projects.find(p => p.name.includes('6074'))

if (!darkKnight) {
  console.log('\nNo project with 6074 found')
  process.exit(0)
}

const projectId = darkKnight.id
console.log('\nUsing project:', darkKnight.name, projectId)

// Check drawings in the project
const { data: drawings, error: drawError } = await supabase
  .from('drawings')
  .select('*')
  .eq('project_id', projectId)
  .eq('is_retired', false)
  .order('drawing_no_norm')
  .limit(10)

if (drawError) {
  console.error('Error fetching drawings:', drawError)
  process.exit(1)
}

console.log('\n=== DRAWINGS ===')
console.log('Found ' + drawings.length + ' drawings')
drawings.forEach(d => {
  console.log('  ' + d.drawing_no_norm + ' (id: ' + d.id + ')')
})

// Check mv_drawing_progress for these drawings
const { data: progress, error: progError } = await supabase
  .from('mv_drawing_progress')
  .select('*')
  .eq('project_id', projectId)
  .limit(10)

if (progError) {
  console.error('Error fetching progress:', progError)
  process.exit(1)
}

console.log('\n=== MV_DRAWING_PROGRESS ===')
console.log('Found ' + progress.length + ' progress records')
progress.forEach(p => {
  const percent = Math.round(p.avg_percent_complete)
  console.log('  ' + p.drawing_no_norm + ': ' + p.completed_components + '/' + p.total_components + ' • ' + percent + '%')
})

// Check components for first drawing
if (drawings.length > 0) {
  const firstDrawing = drawings[0]
  const { data: components, error: compError } = await supabase
    .from('components')
    .select('id, component_type, percent_complete, current_milestones')
    .eq('drawing_id', firstDrawing.id)
    .eq('is_retired', false)
    
  if (compError) {
    console.error('Error fetching components:', compError)
  } else {
    console.log('\n=== COMPONENTS FOR ' + firstDrawing.drawing_no_norm + ' ===')
    console.log('Found ' + components.length + ' components')
    components.forEach(c => {
      console.log('  ' + c.component_type + ': ' + c.percent_complete + '% - milestones:', JSON.stringify(c.current_milestones))
    })
  }
}
