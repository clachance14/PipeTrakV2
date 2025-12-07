import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function investigate() {
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);
  console.log('Project ID:', projectId);

  // Get templates (manual calc method)
  const { data: templates } = await supabase
    .from('progress_templates')
    .select('component_type, milestones_config')
    .eq('version', 1);

  const weightsByType = {};
  templates.forEach(t => {
    weightsByType[t.component_type] = {};
    t.milestones_config.forEach(m => {
      weightsByType[t.component_type][m.name.toLowerCase()] = m.weight;
    });
  });

  console.log('\n=== MANUAL CALC WEIGHTS (lowercase lookup) ===');

  // Check project_progress_templates
  const { data: projTemplates } = await supabase
    .from('project_progress_templates')
    .select('component_type, milestone_name, weight')
    .eq('project_id', projectId);

  console.log('\nProject templates:', projTemplates?.length || 0);

  // Get unique combos from events
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: events } = await supabase
    .from('milestone_events')
    .select('milestone_name, components!inner(component_type, project_id)')
    .eq('components.project_id', projectId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const combos = new Map();
  events.forEach(e => {
    const key = e.components.component_type + '|' + e.milestone_name;
    if (!combos.has(key)) {
      combos.set(key, { type: e.components.component_type, name: e.milestone_name });
    }
  });

  console.log('\n=== WEIGHT COMPARISON: MANUAL vs RPC ===');

  for (const [key, data] of combos) {
    // Manual calc method: lowercase lookup
    const manualWeight = weightsByType[data.type]?.[data.name.toLowerCase()] || 0;

    // RPC method: check project templates first, then system templates with LOWER()
    let rpcWeight = 0;

    // Check project template
    const projMatch = projTemplates?.find(
      pt => pt.component_type === data.type && pt.milestone_name.toLowerCase() === data.name.toLowerCase()
    );
    if (projMatch) {
      rpcWeight = projMatch.weight;
    } else {
      // Check system template (this is what the RPC does)
      const sysWeight = weightsByType[data.type]?.[data.name.toLowerCase()];
      rpcWeight = sysWeight || 0;
    }

    const match = manualWeight === rpcWeight ? 'MATCH' : 'MISMATCH';
    console.log(match + ' | ' + data.type + '/' + data.name + ' | manual=' + manualWeight + ' rpc=' + rpcWeight);
  }

  // Show the actual template weights for field_weld
  console.log('\n=== field_weld system template ===');
  console.log(JSON.stringify(weightsByType['field_weld'], null, 2));

  console.log('\n=== spool system template ===');
  console.log(JSON.stringify(weightsByType['spool'], null, 2));
}

investigate();
