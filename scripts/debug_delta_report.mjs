// Debug script to investigate delta report calculations
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Dark Knight project ID
const PROJECT_ID = 'e34ca1d2-b740-4294-b17c-96fdbc187058';

async function main() {
  console.log('=== Delta Report Debug ===\n');

  // 1. Get project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', PROJECT_ID)
    .single();
  console.log('Project:', project?.name);

  // 2. Check total budgeted manhours from components
  const { data: componentBudget } = await supabase
    .from('components')
    .select('budgeted_manhours, component_type')
    .eq('project_id', PROJECT_ID)
    .eq('is_retired', false);

  const totalBudget = componentBudget?.reduce((sum, c) => sum + (c.budgeted_manhours || 0), 0);
  const nonFieldWeldBudget = componentBudget?.filter(c => c.component_type !== 'field_weld')
    .reduce((sum, c) => sum + (c.budgeted_manhours || 0), 0);

  console.log('\n=== Budget Analysis ===');
  console.log('Total budget (all components):', totalBudget);
  console.log('Non-field-weld budget:', nonFieldWeldBudget);
  console.log('Component count:', componentBudget?.length);
  console.log('Non-field-weld count:', componentBudget?.filter(c => c.component_type !== 'field_weld').length);

  // 3. Check recent milestone events (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentEvents, error: eventsError } = await supabase
    .from('milestone_events')
    .select(`
      id,
      component_id,
      milestone_name,
      value,
      previous_value,
      created_at
    `)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  // Get component details separately
  const componentIds = [...new Set(recentEvents?.map(e => e.component_id) || [])];
  let componentMap = {};
  if (componentIds.length > 0) {
    const { data: components } = await supabase
      .from('components')
      .select('id, component_type, project_id, budgeted_manhours')
      .in('id', componentIds);
    components?.forEach(c => componentMap[c.id] = c);
  }

  // Filter to project and add component data
  const filteredEvents = recentEvents?.filter(e => {
    const comp = componentMap[e.component_id];
    return comp && comp.project_id === PROJECT_ID;
  }).map(e => ({
    ...e,
    component: componentMap[e.component_id]
  })) || [];

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
  }

  console.log('\n=== Recent Milestone Events (Last 7 Days) ===');
  console.log('Total events (all projects):', recentEvents?.length || 0);
  console.log('Events for this project:', filteredEvents.length);

  if (filteredEvents.length > 0) {
    // Group by component type
    const byType = {};
    filteredEvents.forEach(e => {
      const type = e.component.component_type;
      if (!byType[type]) byType[type] = [];
      byType[type].push(e);
    });

    for (const [type, events] of Object.entries(byType)) {
      console.log(`\n${type}:`);
      events.slice(0, 5).forEach(e => {
        const delta = (e.value || 0) - (e.previous_value || 0);
        console.log(`  - ${e.component_id.slice(0,8)}: ${e.milestone_name} ${e.previous_value || 0} -> ${e.value} (delta: ${delta})`);
      });
      if (events.length > 5) {
        console.log(`  ... and ${events.length - 5} more`);
      }
    }

    // Calculate net deltas
    console.log('\n=== Net Delta Calculation ===');
    const netDeltas = {};
    filteredEvents.forEach(e => {
      const key = `${e.component_id}:${e.milestone_name}`;
      if (!netDeltas[key]) {
        netDeltas[key] = {
          componentId: e.component_id,
          type: e.component.component_type,
          milestone: e.milestone_name,
          firstPrevValue: e.previous_value,
          lastValue: e.value,
          budgetedMH: e.component.budgeted_manhours
        };
      }
      // Update with latest value
      netDeltas[key].lastValue = e.value;
    });

    let totalPositiveDelta = 0;
    let totalNegativeDelta = 0;
    for (const [key, data] of Object.entries(netDeltas)) {
      const delta = (data.lastValue || 0) - (data.firstPrevValue || 0);
      if (delta > 0) {
        totalPositiveDelta += delta;
        console.log(`  + ${data.componentId.slice(0,8)} (${data.type}): ${data.milestone} delta = +${delta}`);
      } else if (delta < 0) {
        totalNegativeDelta += delta;
        console.log(`  - ${data.componentId.slice(0,8)} (${data.type}): ${data.milestone} delta = ${delta}`);
      }
    }
    console.log(`\nTotal positive delta: ${totalPositiveDelta}`);
    console.log(`Total negative delta: ${totalNegativeDelta}`);
    console.log(`Net delta: ${totalPositiveDelta + totalNegativeDelta}`);
  } else {
    console.log('No recent events found for this project');
  }

  // 4. Call the RPC directly
  console.log('\n=== RPC Results ===');
  const now = new Date();
  const { data: deltaData, error: deltaError } = await supabase.rpc('get_progress_delta_by_dimension', {
    p_project_id: PROJECT_ID,
    p_dimension: 'area',
    p_start_date: sevenDaysAgo.toISOString(),
    p_end_date: now.toISOString()
  });

  if (deltaError) {
    console.error('RPC Error:', deltaError);
  } else {
    console.log('RPC returned:', JSON.stringify(deltaData, null, 2));
  }

  // 5. Check field weld delta
  const { data: fwDelta, error: fwError } = await supabase.rpc('get_field_weld_delta_by_dimension', {
    p_project_id: PROJECT_ID,
    p_dimension: 'area',
    p_start_date: sevenDaysAgo.toISOString(),
    p_end_date: now.toISOString()
  });

  if (fwError) {
    console.error('Field Weld RPC Error:', fwError);
  } else {
    console.log('\nField Weld Delta RPC:', JSON.stringify(fwDelta, null, 2));
  }

  // 6. Check if templates have categories defined
  console.log('\n=== Template Categories ===');

  // Check project_progress_templates
  const { data: projectTemplates } = await supabase
    .from('project_progress_templates')
    .select('milestone_name, component_type, weight, category')
    .eq('project_id', PROJECT_ID);
  console.log('project_progress_templates count:', projectTemplates?.length || 0);

  // Check progress_templates (system templates)
  const { data: systemTemplates } = await supabase
    .from('progress_templates')
    .select('component_type, milestones_config, version');
  console.log('progress_templates (system) count:', systemTemplates?.length || 0);

  // Parse system templates to show categories
  if (systemTemplates && systemTemplates.length > 0) {
    console.log('\nSystem templates:');
    for (const st of systemTemplates) {
      console.log(`\n${st.component_type} (version ${st.version}):`);
      const milestones = st.milestones_config;
      if (Array.isArray(milestones)) {
        milestones.forEach(m => {
          console.log(`  ${m.name}: weight=${m.weight}, category=${m.category || 'NULL'}`);
        });
      }
    }
  }

  // Check milestone_templates table (old table?)
  const { data: templates } = await supabase
    .from('milestone_templates')
    .select('milestone_name, component_type, weight, category')
    .eq('project_id', PROJECT_ID);

  console.log('\nProject-specific templates:');
  const byComponentType = {};
  projectTemplates?.forEach(t => {
    if (!byComponentType[t.component_type]) byComponentType[t.component_type] = [];
    byComponentType[t.component_type].push(t);
  });

  for (const [type, milestones] of Object.entries(byComponentType)) {
    console.log(`\n${type}:`);
    let totalWeight = 0;
    const categories = new Set();
    milestones.forEach(m => {
      console.log(`  ${m.milestone_name}: weight=${m.weight}, category=${m.category || 'NULL'}`);
      totalWeight += m.weight || 0;
      if (m.category) categories.add(m.category);
    });
    console.log(`  TOTAL WEIGHT: ${totalWeight}%, CATEGORIES: ${[...categories].join(', ') || 'NONE'}`);
  }

  // 7. Debug the budget calculation
  console.log('\n=== Budget Calculation Debug ===');

  // Get unique component types with their counts and budgets
  const { data: typeStats } = await supabase
    .from('components')
    .select('component_type, budgeted_manhours')
    .eq('project_id', PROJECT_ID)
    .eq('is_retired', false)
    .neq('component_type', 'field_weld');

  const statsByType = {};
  typeStats?.forEach(c => {
    if (!statsByType[c.component_type]) {
      statsByType[c.component_type] = { count: 0, totalBudget: 0 };
    }
    statsByType[c.component_type].count++;
    statsByType[c.component_type].totalBudget += c.budgeted_manhours || 0;
  });

  console.log('\nBudget by component type (excluding field welds):');
  let totalComponentBudget = 0;
  for (const [type, stats] of Object.entries(statsByType)) {
    const typeTemplates = byComponentType[type] || [];
    const categoryCount = typeTemplates.filter(t => t.category).length;
    console.log(`  ${type}: ${stats.count} components, ${stats.totalBudget.toFixed(2)} MH budget`);
    console.log(`    Template has ${typeTemplates.length} milestones, ${categoryCount} with categories`);
    totalComponentBudget += stats.totalBudget;
  }
  console.log(`\nTotal actual budget: ${totalComponentBudget.toFixed(2)} MH`);
  console.log(`RPC reported budget: 12,929.71 MH`);
  console.log(`Ratio: ${(12929.71 / totalComponentBudget).toFixed(2)}x`);

  // The issue: CROSS JOIN LATERAL creates multiple rows per component (one per category)
  // Let's calculate what the RPC would compute
  console.log('\n=== Simulating RPC Budget Calculation ===');
  let simulatedBudget = 0;
  for (const [type, stats] of Object.entries(statsByType)) {
    const typeTemplates = byComponentType[type] || [];
    // Count unique categories
    const categories = [...new Set(typeTemplates.map(t => t.category).filter(Boolean))];
    // Each component gets counted once per category in the CROSS JOIN
    const multiplier = categories.length || 1;
    const typeBudgetContribution = stats.totalBudget * multiplier;
    simulatedBudget += typeBudgetContribution;
    console.log(`  ${type}: ${stats.totalBudget.toFixed(2)} MH × ${multiplier} categories = ${typeBudgetContribution.toFixed(2)} MH`);
  }
  console.log(`\nSimulated budget (with category multiplication): ${simulatedBudget.toFixed(2)} MH`);
}

main().catch(console.error);
