#!/usr/bin/env node

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

const userId = '1b093e7b-2cfc-41a0-be9b-72f07c8a0988'

console.log('🔍 Checking data for user:', userId)
console.log('')

// Check field_welds
const { data: fieldWelds, error: fwError } = await supabase
  .from('field_welds')
  .select('*')
  .eq('created_by', userId)

console.log('Field Welds created by user:', fieldWelds?.length || 0)
if (fwError) console.log('Error:', fwError.message)
if (fieldWelds && fieldWelds.length > 0) {
  console.log('Sample:', fieldWelds[0])
}

// Check components
const { data: components, count: compCount } = await supabase
  .from('components')
  .select('*', { count: 'exact' })
  .or(`created_by.eq.${userId},last_updated_by.eq.${userId}`)

console.log('\nComponents created/updated by user:', compCount)

// Check milestone_events
const { data: milestones, count: msCount } = await supabase
  .from('milestone_events')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)

console.log('Milestone events by user:', msCount)

// Check drawings
const { data: drawings, count: drawCount } = await supabase
  .from('drawings')
  .select('*', { count: 'exact' })
  .eq('created_by', userId)

console.log('Drawings created by user:', drawCount)

// Check projects
const { data: projects, count: projCount } = await supabase
  .from('projects')
  .select('*', { count: 'exact' })
  .eq('created_by', userId)

console.log('Projects created by user:', projCount)
