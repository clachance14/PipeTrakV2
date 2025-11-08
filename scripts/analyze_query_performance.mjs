#!/usr/bin/env node
/**
 * Query plan analysis for vw_recent_activity performance
 * Uses EXPLAIN ANALYZE to identify bottlenecks
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
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

console.log('🔍 Query Performance Analysis')
console.log('=' .repeat(60))

// Get test project
const { data: projects } = await supabase
  .from('projects')
  .select('id, name')
  .limit(1)

if (!projects || projects.length === 0) {
  console.error('❌ No projects found')
  process.exit(1)
}

const testProject = projects[0]
console.log(`\nProject: ${testProject.name} (${testProject.id})`)

// Check if indexes exist on base tables
console.log('\n📊 Note: Index checking requires SQL Editor access')
console.log('   Use Supabase Dashboard to run:')
console.log(`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('milestone_events', 'components', 'users', 'drawings')
    ORDER BY tablename, indexname;
`)

// Run EXPLAIN ANALYZE
console.log('\n⏱️  Query Plan Analysis')
console.log('=' .repeat(60))

const query = `
  EXPLAIN ANALYZE
  SELECT *
  FROM vw_recent_activity
  WHERE project_id = '${testProject.id}'
  ORDER BY timestamp DESC
  LIMIT 10;
`

console.log('\n⚠️  Cannot execute EXPLAIN ANALYZE via JS client')
console.log('\n📋 To analyze query plan:')
console.log('   1. Go to Supabase Dashboard → SQL Editor')
console.log('   2. Run this query:\n')
console.log(query)
console.log('\n   Look for:')
console.log('   - Sequential Scans (bad) vs Index Scans (good)')
console.log('   - Execution time breakdown by operation')
console.log('   - Join methods used')

// Check row counts
console.log('\n📈 Row counts in base tables:')

const tables = ['milestone_events', 'components', 'users', 'drawings']
for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (!error) {
    console.log(`   ${table}: ${count} rows`)
  }
}

console.log('\n💡 Performance Optimization Recommendations:')
console.log('=' .repeat(60))
console.log('1. Add composite index on milestone_events:')
console.log('   CREATE INDEX idx_milestone_events_component_created')
console.log('   ON milestone_events (component_id, created_at DESC);')
console.log()
console.log('2. Add index on components.project_id:')
console.log('   CREATE INDEX idx_components_project_id')
console.log('   ON components (project_id);')
console.log()
console.log('3. Consider materialized view if data latency is acceptable:')
console.log('   CREATE MATERIALIZED VIEW mv_recent_activity AS')
console.log('   SELECT * FROM vw_recent_activity;')
console.log('   CREATE INDEX ON mv_recent_activity (project_id, timestamp DESC);')
console.log()
console.log('4. The LATERAL join for initials may be expensive - consider:')
console.log('   - Pre-computing initials in users table with trigger')
console.log('   - Or using a simpler substring approach')
