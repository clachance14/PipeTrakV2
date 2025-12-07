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

  // Get system templates
  const { data: templates } = await supabase
    .from('progress_templates')
    .select('component_type, milestones_config')
    .eq('version', 1);

  const systemWeights = {};
  templates.forEach(t => {
    systemWeights[t.component_type] = {};
    t.milestones_config.forEach(m => {
      systemWeights[t.component_type][m.name.toLowerCase()] = m.weight;
    });
  });

  // Get project templates
  const { data: projTemplates } = await supabase
    .from('project_progress_templates')
    .select('component_type, milestone_name, weight')
    .eq('project_id', projectId);

  const projectWeights = {};
  projTemplates.forEach(pt => {
    if (!projectWeights[pt.component_type]) {
      projectWeights[pt.component_type] = {};
    }
    projectWeights[pt.component_type][pt.milestone_name.toLowerCase()] = pt.weight;
  });

  function getWeight(componentType, milestoneName) {
    const lowerName = milestoneName.toLowerCase();
    const projWeight = projectWeights[componentType]?.[lowerName];
    if (projWeight !== undefined) return projWeight;
    return systemWeights[componentType]?.[lowerName] || 0;
  }

  // Get all components with progress
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, percent_complete, budgeted_manhours, current_milestones, area_id, identity_key, created_at')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .not('area_id', 'is', null)
    .gt('percent_complete', 0);

  console.log('Components with progress > 0:', components.length);

  // For each component, compare current progress to event-tracked progress
  let totalCurrentMH = 0;
  let totalEventMH = 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const mismatches = [];

  for (const c of components) {
    const mh = c.budgeted_manhours || 0;
    const currentMH = (c.percent_complete / 100) * mh;
    totalCurrentMH += currentMH;

    // Get events for this component
    const { data: events } = await supabase
      .from('milestone_events')
      .select('milestone_name, value, previous_value')
      .eq('component_id', c.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Calculate MH from events
    let eventMH = 0;
    if (events && events.length > 0) {
      // Group by milestone
      const byMilestone = {};
      events.forEach(e => {
        if (!byMilestone[e.milestone_name]) {
          byMilestone[e.milestone_name] = { first: e, last: e };
        } else {
          byMilestone[e.milestone_name].last = e;
        }
      });

      Object.entries(byMilestone).forEach(([name, data]) => {
        const weight = getWeight(c.component_type, name);
        if (!weight) return;

        const startVal = data.first.previous_value || 0;
        const endVal = data.last.value || 0;
        const netChange = Math.max(endVal - startVal, 0);
        eventMH += (netChange / 100) * mh * (weight / 100);
      });
    }

    totalEventMH += eventMH;

    // Check for mismatch
    const gap = currentMH - eventMH;
    if (Math.abs(gap) > 0.01) {
      const ik = c.identity_key || {};
      const name = ik.spool_id || ik.weld_number || ik.tag || c.id.slice(0, 8);
      mismatches.push({
        type: c.component_type,
        name: name,
        currentMH: currentMH.toFixed(2),
        eventMH: eventMH.toFixed(2),
        gap: gap.toFixed(2),
        pct: c.percent_complete,
        milestones: c.current_milestones,
        created: c.created_at
      });
    }
  }

  console.log('\n=== TOTAL COMPARISON ===');
  console.log('Current MH (from percent_complete):', totalCurrentMH.toFixed(2));
  console.log('Event MH (from milestone_events):', totalEventMH.toFixed(2));
  console.log('Gap:', (totalCurrentMH - totalEventMH).toFixed(2), 'MH');

  if (mismatches.length > 0) {
    console.log('\n=== COMPONENTS WITH PROGRESS NOT TRACKED IN EVENTS ===');
    console.log('Count:', mismatches.length);

    // Group by type
    const byType = {};
    mismatches.forEach(m => {
      if (!byType[m.type]) byType[m.type] = [];
      byType[m.type].push(m);
    });

    Object.entries(byType).forEach(([type, items]) => {
      console.log('\n' + type.toUpperCase() + ' (' + items.length + ' components):');
      items.slice(0, 5).forEach(m => {
        console.log('  ' + m.name + ': current=' + m.currentMH + 'MH, events=' + m.eventMH + 'MH, gap=' + m.gap + 'MH');
        console.log('    pct=' + m.pct + '%, milestones=' + JSON.stringify(m.milestones));
        console.log('    created=' + m.created);
      });
      if (items.length > 5) {
        console.log('  ... and ' + (items.length - 5) + ' more');
      }
    });
  }
}

investigate();
