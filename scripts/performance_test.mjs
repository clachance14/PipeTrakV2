#!/usr/bin/env node
/**
 * Performance validation script for vw_recent_activity view
 * Tests query performance against <100ms target per quickstart.md
 *
 * Usage: node performance_test.mjs
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

// Use service role to bypass RLS for testing
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('🔍 Performance Test for vw_recent_activity')
console.log('=' .repeat(50))

// First, get a valid project_id
console.log('\n1️⃣  Fetching test project...')
const { data: projects, error: projectError } = await supabase
  .from('projects')
  .select('id, name')
  .limit(1)

if (projectError) {
  console.error('❌ Error fetching project:', projectError)
  process.exit(1)
}

if (!projects || projects.length === 0) {
  console.error('❌ No projects found in database')
  console.error('   Create a project first before running performance tests')
  process.exit(1)
}

const testProject = projects[0]
console.log(`   Using project: ${testProject.name} (${testProject.id})`)

// Run the performance test
console.log('\n2️⃣  Testing vw_recent_activity query performance...')
console.log(`   Query: SELECT * FROM vw_recent_activity`)
console.log(`   Filter: project_id = '${testProject.id}'`)
console.log(`   Order: timestamp DESC`)
console.log(`   Limit: 10`)
console.log()

const start = Date.now()
const { data, error } = await supabase
  .from('vw_recent_activity')
  .select('*')
  .eq('project_id', testProject.id)
  .order('timestamp', { ascending: false })
  .limit(10)
const elapsed = Date.now() - start

console.log('⏱️  Results:')
console.log('=' .repeat(50))
console.log(`   Query time: ${elapsed}ms`)
console.log(`   Target: <100ms`)
console.log(`   Rows returned: ${data?.length || 0}`)

if (error) {
  console.error('\n❌ Query Error:', error)
  process.exit(1)
}

// Performance evaluation
const TARGET_MS = 100
const performanceMargin = (TARGET_MS - elapsed) / TARGET_MS * 100

if (elapsed < TARGET_MS) {
  console.log(`\n✅ PASS - Query completed in ${elapsed}ms`)
  console.log(`   Performance margin: ${performanceMargin.toFixed(1)}% under target`)

  if (elapsed < TARGET_MS * 0.5) {
    console.log('   🚀 Excellent performance!')
  }
} else {
  console.log(`\n❌ FAIL - Query took ${elapsed}ms (${elapsed - TARGET_MS}ms over target)`)
  console.log('\n💡 Optimization suggestions:')
  console.log('   1. Add index on vw_recent_activity (project_id, timestamp DESC)')
  console.log('   2. Review base table indexes (activity_log, components, etc.)')
  console.log('   3. Consider materialized view if data is not real-time critical')
  console.log('   4. Check EXPLAIN ANALYZE output for query plan')
  process.exit(1)
}

// Additional diagnostics
if (data && data.length > 0) {
  console.log('\n📊 Sample Data:')
  console.log('   First row:', {
    activity_type: data[0].activity_type,
    entity_type: data[0].entity_type,
    timestamp: data[0].timestamp
  })
}

console.log('\n' + '='.repeat(50))
console.log('✅ Performance validation complete')
