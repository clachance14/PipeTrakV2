#!/usr/bin/env node
/**
 * Multiple-run performance test for vw_recent_activity
 * Runs 10 tests and reports average, min, max
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

console.log('🔍 Multi-Run Performance Test for vw_recent_activity')
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
console.log('Running 10 tests...\n')

const times = []
const numRuns = 10

for (let i = 0; i < numRuns; i++) {
  const start = Date.now()
  const { data, error } = await supabase
    .from('vw_recent_activity')
    .select('*')
    .eq('project_id', testProject.id)
    .order('timestamp', { ascending: false })
    .limit(10)
  const elapsed = Date.now() - start

  if (error) {
    console.error(`❌ Run ${i + 1} failed:`, error)
    continue
  }

  times.push(elapsed)
  console.log(`   Run ${i + 1}: ${elapsed}ms (${data?.length || 0} rows)`)

  // Small delay between runs
  await new Promise(resolve => setTimeout(resolve, 100))
}

console.log('\n📊 Statistics:')
console.log('=' .repeat(60))

const avg = times.reduce((a, b) => a + b, 0) / times.length
const min = Math.min(...times)
const max = Math.max(...times)
const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)]

console.log(`   Average: ${avg.toFixed(1)}ms`)
console.log(`   Median:  ${median}ms`)
console.log(`   Min:     ${min}ms`)
console.log(`   Max:     ${max}ms`)
console.log(`   Target:  <100ms`)

const TARGET_MS = 100

if (avg < TARGET_MS) {
  console.log(`\n✅ PASS - Average ${avg.toFixed(1)}ms is under target`)
  if (max > TARGET_MS) {
    console.log(`⚠️  Warning: Max time ${max}ms exceeds target (possible cold start)`)
  }
} else {
  console.log(`\n❌ FAIL - Average ${avg.toFixed(1)}ms exceeds target by ${(avg - TARGET_MS).toFixed(1)}ms`)
}

// Check if first run was significantly slower (cold start)
if (times.length > 1 && times[0] > avg * 1.5) {
  console.log(`\n💡 Note: First run was ${times[0]}ms (${(times[0] / avg).toFixed(1)}x slower)`)
  console.log('   This suggests cold start overhead')
  console.log(`   Average without first run: ${(times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1)).toFixed(1)}ms`)
}
