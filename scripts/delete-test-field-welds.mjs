#!/usr/bin/env node
/**
 * Delete Test Field Welds Script
 *
 * Deletes field welds TEST-W-001 through TEST-W-020 from the database.
 * Deletes both components and field_welds records (CASCADE handles field_welds).
 *
 * Usage:
 *   node scripts/delete-test-field-welds.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
function loadEnv() {
  try {
    const envContent = readFileSync('.env', 'utf-8')
    const env = {}

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim()
          const value = trimmed.substring(eqIndex + 1).trim()
          env[key] = value
        }
      }
    })

    return env
  } catch (error) {
    console.error('Error reading .env file:', error.message)
    process.exit(1)
  }
}

async function main() {
  console.log('🗑️  Starting field weld deletion script...\n')

  // Load environment variables
  const env = loadEnv()
  const supabaseUrl = env.VITE_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  console.log('✓ Connected to Supabase\n')

  // Generate weld numbers to delete
  const weldNumbers = []
  for (let i = 1; i <= 20; i++) {
    weldNumbers.push(`TEST-W-${String(i).padStart(3, '0')}`)
  }

  console.log('🔍 Finding field welds to delete...')

  // Find all field weld components and filter in JavaScript
  const { data: allComponents, error: findError } = await supabase
    .from('components')
    .select('id, identity_key')
    .eq('component_type', 'field_weld')

  if (findError) {
    console.error('❌ Error finding components:', findError.message)
    process.exit(1)
  }

  // Filter for TEST-W-* weld numbers
  const components = allComponents.filter(c =>
    c.identity_key?.weld_number &&
    weldNumbers.includes(c.identity_key.weld_number)
  )

  if (!components || components.length === 0) {
    console.log('✓ No field welds found to delete')
    process.exit(0)
  }

  console.log(`✓ Found ${components.length} field welds to delete\n`)

  // Delete components (CASCADE will delete field_welds)
  let deletedCount = 0
  let errorCount = 0

  for (const component of components) {
    const weldNumber = component.identity_key.weld_number

    const { error: deleteError } = await supabase
      .from('components')
      .delete()
      .eq('id', component.id)

    if (deleteError) {
      console.error(`  ❌ ${weldNumber}: Failed to delete - ${deleteError.message}`)
      errorCount++
    } else {
      console.log(`  ✓ ${weldNumber}: Deleted`)
      deletedCount++
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`   ✓ Successfully deleted: ${deletedCount} field welds`)
  if (errorCount > 0) {
    console.log(`   ❌ Failed: ${errorCount} field welds`)
  }
  console.log('='.repeat(50))

  process.exit(errorCount > 0 ? 1 : 0)
}

// Run script
main().catch(error => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})
