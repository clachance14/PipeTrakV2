// Add threaded pipe test data to Test2 project
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  if (!supabaseUrl) console.error('  - VITE_SUPABASE_URL is not set')
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY is not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function main() {
  console.log('=== Finding Test2 Project ===')

  // Find Test 2 project
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('name', 'Test 2')

  if (projectError) {
    console.error('Error finding project:', projectError)
    return
  }

  if (!projects || projects.length === 0) {
    console.log('No Test2 project found. Available projects:')
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name')
    console.log(allProjects)
    return
  }

  const test2Project = projects[0]
  console.log('Found project:', test2Project.name, '(ID:', test2Project.id, ')')

  // Get threaded_pipe progress template
  console.log('\n=== Getting Threaded Pipe Template ===')
  const { data: template, error: templateError } = await supabase
    .from('progress_templates')
    .select('*')
    .eq('component_type', 'threaded_pipe')
    .single()

  if (templateError) {
    console.error('Error getting template:', templateError)
    return
  }

  console.log('Template:', template.component_type, 'version', template.version)
  console.log('Milestones:', template.milestones_config.map(m => m.name).join(', '))

  // Check for existing drawings or create new ones
  console.log('\n=== Checking/Creating Drawings ===')

  const { data: existingDrawings } = await supabase
    .from('drawings')
    .select('*')
    .eq('project_id', test2Project.id)
    .in('drawing_no_raw', ['TP-DWG-001', 'TP-DWG-002'])

  let drawings

  if (existingDrawings && existingDrawings.length === 2) {
    console.log('Using existing drawings:')
    drawings = existingDrawings
    drawings.forEach(d => console.log(`  - ${d.drawing_no_raw}: ${d.title}`))
  } else {
    const drawingData = [
      {
        project_id: test2Project.id,
        drawing_no_raw: 'TP-DWG-001',
        drawing_no_norm: 'TP-DWG-001',
        title: 'Threaded Piping - Area A',
        rev: 'A'
      },
      {
        project_id: test2Project.id,
        drawing_no_raw: 'TP-DWG-002',
        drawing_no_norm: 'TP-DWG-002',
        title: 'Threaded Piping - Area B',
        rev: 'A'
      }
    ]

    const { data: newDrawings, error: drawingError } = await supabase
      .from('drawings')
      .insert(drawingData)
      .select()

    if (drawingError) {
      console.error('Error creating drawings:', drawingError)
      return
    }

    drawings = newDrawings
    console.log(`Created ${drawings.length} new drawings:`)
    drawings.forEach(d => console.log(`  - ${d.drawing_no_raw}: ${d.title}`))
  }

  // Create threaded pipe components
  console.log('\n=== Creating Threaded Pipe Components ===')
  const componentData = [
    // Drawing 1 components
    {
      project_id: test2Project.id,
      drawing_id: drawings[0].id,
      component_type: 'threaded_pipe',
      identity_key: {
        drawing_norm: drawings[0].drawing_no_norm,
        commodity_code: 'PIPE-THR-CS',
        size: '1"',
        seq: 1
      },
      attributes: {
        size: '1"',
        commodity_code: 'PIPE-THR-CS',
        description: '1" Threaded Carbon Steel Pipe'
      },
      progress_template_id: template.id,
      current_milestones: {
        Fabricate: 0,
        Install: 0,
        Erect: 0,
        Connect: 0,
        Support: 0,
        Punch: false,
        Test: false,
        Restore: false
      }
    },
    {
      project_id: test2Project.id,
      drawing_id: drawings[0].id,
      component_type: 'threaded_pipe',
      identity_key: {
        drawing_norm: drawings[0].drawing_no_norm,
        commodity_code: 'PIPE-THR-CS',
        size: '2"',
        seq: 2
      },
      attributes: {
        size: '2"',
        commodity_code: 'PIPE-THR-CS',
        description: '2" Threaded Carbon Steel Pipe'
      },
      progress_template_id: template.id,
      current_milestones: {
        Fabricate: 50,
        Install: 25,
        Erect: 0,
        Connect: 0,
        Support: 0,
        Punch: false,
        Test: false,
        Restore: false
      }
    },
    {
      project_id: test2Project.id,
      drawing_id: drawings[0].id,
      component_type: 'threaded_pipe',
      identity_key: {
        drawing_norm: drawings[0].drawing_no_norm,
        commodity_code: 'PIPE-THR-SS',
        size: '1.5"',
        seq: 1
      },
      attributes: {
        size: '1.5"',
        commodity_code: 'PIPE-THR-SS',
        description: '1.5" Threaded Stainless Steel Pipe'
      },
      progress_template_id: template.id,
      current_milestones: {
        Fabricate: 100,
        Install: 100,
        Erect: 75,
        Connect: 0,
        Support: 0,
        Punch: false,
        Test: false,
        Restore: false
      }
    },
    // Drawing 2 components
    {
      project_id: test2Project.id,
      drawing_id: drawings[1].id,
      component_type: 'threaded_pipe',
      identity_key: {
        drawing_norm: drawings[1].drawing_no_norm,
        commodity_code: 'PIPE-THR-CS',
        size: '3/4"',
        seq: 1
      },
      attributes: {
        size: '3/4"',
        commodity_code: 'PIPE-THR-CS',
        description: '3/4" Threaded Carbon Steel Pipe'
      },
      progress_template_id: template.id,
      current_milestones: {
        Fabricate: 0,
        Install: 0,
        Erect: 0,
        Connect: 0,
        Support: 0,
        Punch: false,
        Test: false,
        Restore: false
      }
    },
    {
      project_id: test2Project.id,
      drawing_id: drawings[1].id,
      component_type: 'threaded_pipe',
      identity_key: {
        drawing_norm: drawings[1].drawing_no_norm,
        commodity_code: 'PIPE-THR-CS',
        size: '2"',
        seq: 1
      },
      attributes: {
        size: '2"',
        commodity_code: 'PIPE-THR-CS',
        description: '2" Threaded Carbon Steel Pipe'
      },
      progress_template_id: template.id,
      current_milestones: {
        Fabricate: 100,
        Install: 100,
        Erect: 100,
        Connect: 100,
        Support: 100,
        Punch: true,
        Test: false,
        Restore: false
      }
    }
  ]

  const { data: components, error: componentError } = await supabase
    .from('components')
    .insert(componentData)
    .select()

  if (componentError) {
    console.error('Error creating components:', componentError)
    return
  }

  console.log(`Created ${components.length} threaded pipe components:`)
  components.forEach(c => {
    const totalPercentage = ['Fabricate', 'Install', 'Erect', 'Connect', 'Support']
      .reduce((sum, milestone) => sum + (c.current_milestones[milestone] || 0), 0)
    const discreteCount = ['Punch', 'Test', 'Restore']
      .filter(milestone => c.current_milestones[milestone] === true).length

    const displayName = `${c.identity_key.drawing_norm}-${c.identity_key.commodity_code}-${c.identity_key.size}-${c.identity_key.seq}`
    console.log(`  - ${displayName}: ${totalPercentage}% partial + ${discreteCount}/3 discrete milestones`)
  })

  console.log('\n=== Summary ===')
  console.log(`✓ Created 2 drawings in ${test2Project.name}`)
  console.log(`✓ Created 5 threaded pipe components`)
  console.log(`  - 3 components on ${drawings[0].drawing_no_raw}`)
  console.log(`  - 2 components on ${drawings[1].drawing_no_raw}`)
}

main().catch(console.error)
