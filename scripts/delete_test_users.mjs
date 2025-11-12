#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file manually
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
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Service role bypasses RLS (needed for admin operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Users to delete (hard delete)
// Note: 6 users already deleted, only 1 remaining
const userIdsToDelete = [
  '1b093e7b-2cfc-41a0-be9b-72f07c8a0988', // clachance-old@ics.ac (non-demo user - will preserve organization)
]

async function analyzeUserData() {
  console.log('📊 Analyzing user data and dependencies...\n')

  for (const userId of userIdsToDelete) {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, organization_id, is_demo_user')
      .eq('id', userId)
      .single()

    if (!user) {
      console.log(`⚠️  User ${userId} not found in database`)
      continue
    }

    console.log(`👤 ${user.email}`)
    console.log(`   User ID: ${user.id}`)
    console.log(`   Organization ID: ${user.organization_id || 'None'}`)
    console.log(`   Demo User: ${user.is_demo_user}`)

    // Check organization data
    if (user.organization_id) {
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)

      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user.organization_id)

      console.log(`   Organization has ${projectCount} projects and ${userCount} users`)
    }

    console.log('')
  }
}

async function deleteUsers(dryRun = true) {
  console.log(dryRun ? '🔍 DRY RUN - No actual deletions' : '🗑️  DELETING USERS')
  console.log('=' .repeat(60))
  console.log('')

  const results = {
    organizationsDeleted: 0,
    projectsDeleted: 0,
    usersDeleted: 0,
    authUsersDeleted: 0,
    errors: []
  }

  for (const userId of userIdsToDelete) {
    try {
      console.log(`Processing user: ${userId}`)

      // Get user details
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, organization_id, is_demo_user')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        console.log(`  ⚠️  User not found: ${userError?.message || 'Not in database'}`)
        results.errors.push({ userId, error: 'User not found' })
        continue
      }

      console.log(`  📧 ${user.email}`)

      // Step 1: Handle ALL user foreign keys (set to NULL or delete records)
      if (!dryRun) {
        console.log(`  🔗 Nullifying user references...`)

        // Update components (created_by and last_updated_by)
        const { error: compError } = await supabase
          .from('components')
          .update({ created_by: null, last_updated_by: null })
          .or(`created_by.eq.${userId},last_updated_by.eq.${userId}`)
        if (compError) console.log(`     ⚠️  components: ${compError.message}`)

        // Update drawings
        const { error: drawError } = await supabase
          .from('drawings')
          .update({ created_by: null })
          .eq('created_by', userId)
        if (drawError) console.log(`     ⚠️  drawings: ${drawError.message}`)

        // Update projects
        const { error: projError } = await supabase
          .from('projects')
          .update({ created_by: null })
          .eq('created_by', userId)
        if (projError) console.log(`     ⚠️  projects: ${projError.message}`)

        // Delete field_welds (created_by is NOT NULL, can't set to null)
        const { error: fwError, count: fwCount } = await supabase
          .from('field_welds')
          .delete()
          .eq('created_by', userId)
          .select('*', { count: 'exact', head: true })

        if (fwError) {
          console.log(`     ❌ field_welds DELETE FAILED: ${fwError.message}`)
        } else {
          console.log(`     ✅ field_welds: ${fwCount} records deleted`)
        }

        // Update packages
        const { error: pkgError } = await supabase
          .from('packages')
          .update({ created_by: null })
          .eq('created_by', userId)
        if (pkgError) console.log(`     ⚠️  packages: ${pkgError.message}`)

        // Delete milestone_events for this user (historical data, safe to delete)
        const { error: milestoneError, count: msCount } = await supabase
          .from('milestone_events')
          .delete()
          .eq('user_id', userId)
          .select('*', { count: 'exact', head: true })

        if (milestoneError) {
          console.log(`     ⚠️  milestone_events: ${milestoneError.message}`)
        } else if (msCount > 0) {
          console.log(`     ✅ milestone_events: ${msCount} records deleted`)
        }

        // Delete activity_logs for this user (if exists)
        const { error: actError } = await supabase
          .from('activity_logs')
          .delete()
          .eq('user_id', userId)
        if (actError) console.log(`     ⚠️  activity_logs: ${actError.message}`)

        // Update invitations (invited_by)
        const { error: invError } = await supabase
          .from('invitations')
          .update({ invited_by: null })
          .eq('invited_by', userId)
        if (invError) console.log(`     ⚠️  invitations: ${invError.message}`)
      }

      // Step 2: Delete organization and associated data ONLY for demo users
      if (user.organization_id && user.is_demo_user) {
        console.log(`  🏢 Deleting demo organization: ${user.organization_id}`)

        if (!dryRun) {
          // Delete projects (cascade will handle components, drawings, packages, etc.)
          const { data: projects, error: projectError } = await supabase
            .from('projects')
            .delete()
            .eq('organization_id', user.organization_id)
            .select('id')

          if (projectError) {
            console.log(`  ❌ Error deleting projects: ${projectError.message}`)
            results.errors.push({ userId, error: projectError.message })
          } else {
            const projectCount = projects?.length || 0
            results.projectsDeleted += projectCount
            console.log(`     Deleted ${projectCount} projects`)
          }
        }
      } else if (user.organization_id && !user.is_demo_user) {
        console.log(`  ⚠️  Non-demo user with organization - will NOT delete organization`)
        console.log(`     Organization ${user.organization_id} will be preserved`)
      }

      // Step 3: Delete user from users table (BEFORE deleting organization due to FK)
      if (!dryRun) {
        const { error: deleteUserError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId)

        if (deleteUserError) {
          console.log(`  ❌ Error deleting user: ${deleteUserError.message}`)
          results.errors.push({ userId, error: deleteUserError.message })
        } else {
          results.usersDeleted++
        }
      }

      // Step 4: Delete organization (AFTER user is deleted)
      if (user.organization_id && user.is_demo_user) {
        if (!dryRun) {
          const { error: orgError } = await supabase
            .from('organizations')
            .delete()
            .eq('id', user.organization_id)

          if (orgError) {
            console.log(`  ❌ Error deleting organization: ${orgError.message}`)
            results.errors.push({ userId, error: orgError.message })
          } else {
            results.organizationsDeleted++
            console.log(`     Deleted organization`)
          }
        }
      }

      // Step 5: Delete from Supabase Auth
      if (!dryRun) {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId)

        if (authError) {
          console.log(`  ❌ Error deleting auth user: ${authError.message}`)
          results.errors.push({ userId, error: authError.message })
        } else {
          results.authUsersDeleted++
        }
      }

      console.log(`  ✅ User processed`)
      console.log('')

    } catch (error) {
      console.log(`  ❌ Unexpected error: ${error.message}`)
      results.errors.push({ userId, error: error.message })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Organizations deleted: ${results.organizationsDeleted}`)
  console.log(`Projects deleted: ${results.projectsDeleted}`)
  console.log(`Users deleted (DB): ${results.usersDeleted}`)
  console.log(`Users deleted (Auth): ${results.authUsersDeleted}`)
  console.log(`Errors: ${results.errors.length}`)

  if (results.errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    results.errors.forEach(({ userId, error }) => {
      console.log(`  - ${userId}: ${error}`)
    })
  }

  return results
}

// Main execution
console.log('🧹 Test User Cleanup Script')
console.log('='.repeat(60))
console.log('')

// Step 1: Analyze
await analyzeUserData()

// Step 2: Dry run
console.log('\n' + '='.repeat(60))
await deleteUsers(true)

// Step 3: Prompt for actual deletion
console.log('\n⚠️  To execute actual deletion, run:')
console.log('node scripts/delete_test_users.mjs --execute')

if (process.argv.includes('--execute')) {
  console.log('\n⚠️  EXECUTING ACTUAL DELETION IN 5 SECONDS...')
  console.log('Press Ctrl+C to cancel')
  await new Promise(resolve => setTimeout(resolve, 5000))

  console.log('\n')
  await deleteUsers(false)
  console.log('\n✅ Cleanup complete')
}
