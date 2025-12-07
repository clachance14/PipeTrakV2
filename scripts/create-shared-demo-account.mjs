/**
 * Create Shared Demo Account Script
 * Feature: 031-one-click-demo-access
 *
 * Creates the permanent shared demo account for one-click demo access:
 * - Email: demo@pipetrak.co
 * - Password: Set via DEMO_PASSWORD env var
 * - Organization: PipeTrak Demo
 * - Project: PipeTrak Demo Project
 * - Skeleton data: 5 areas, 5 systems, 10 test packages, 4 welders
 *
 * Run from project root: DEMO_PASSWORD=xxx node scripts/create-shared-demo-account.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Configuration
const DEMO_EMAIL = 'demo@pipetrak.co'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || (() => { throw new Error('DEMO_PASSWORD env var required') })()
const DEMO_FULL_NAME = 'Demo User'
const ORG_NAME = 'PipeTrak Demo'
const PROJECT_NAME = 'PipeTrak Demo Project'

// Load environment variables from .env file
function loadEnv() {
  const envContent = readFileSync('.env', 'utf-8')
  const env = {}

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })

  return env
}

async function main() {
  console.log('🚀 Creating shared demo account...\n')

  // Load environment
  const env = loadEnv()
  const supabaseUrl = env.VITE_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:')
    if (!supabaseUrl) console.error('  - VITE_SUPABASE_URL')
    if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Step 1: Check if demo user already exists
    console.log('1️⃣ Checking for existing demo account...')
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, organization_id')
      .eq('email', DEMO_EMAIL)
      .single()

    if (existingUser) {
      console.log(`   ⚠️ Demo account already exists (ID: ${existingUser.id})`)
      console.log(`   Organization ID: ${existingUser.organization_id}`)

      // Check for existing project
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', existingUser.organization_id)
        .single()

      if (existingProject) {
        console.log(`   Project ID: ${existingProject.id}`)
        console.log(`   Project Name: ${existingProject.name}`)
      }

      console.log('\n✅ Demo account is ready to use!')
      console.log(`   Email: ${DEMO_EMAIL}`)
      console.log(`   Password: ${DEMO_PASSWORD}`)
      return
    }

    // Step 2: Create auth user with password
    console.log('2️⃣ Creating auth user...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: DEMO_FULL_NAME,
        is_demo_account: true // Marks as the shared demo account
      }
    })

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`)
    }

    console.log(`   ✅ Auth user created (ID: ${authUser.user.id})`)

    // Step 3: Create organization
    console.log('3️⃣ Creating organization...')
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: ORG_NAME })
      .select()
      .single()

    if (orgError) {
      // Cleanup auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Failed to create organization: ${orgError.message}`)
    }

    console.log(`   ✅ Organization created (ID: ${org.id})`)

    // Step 4: Update users table with organization_id
    // Note: The trigger should have already created the users record
    console.log('4️⃣ Updating user record...')

    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))

    const { error: userError } = await supabase
      .from('users')
      .update({
        organization_id: org.id,
        is_demo_user: false // This is the SHARED demo account, not a temporary demo
      })
      .eq('id', authUser.user.id)

    if (userError) {
      // Cleanup
      await supabase.auth.admin.deleteUser(authUser.user.id)
      await supabase.from('organizations').delete().eq('id', org.id)
      throw new Error(`Failed to update user record: ${userError.message}`)
    }

    console.log('   ✅ User record updated')

    // Step 5: Create project
    console.log('5️⃣ Creating project...')
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: PROJECT_NAME,
        organization_id: org.id
      })
      .select()
      .single()

    if (projectError) {
      // Cleanup
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Failed to create project: ${projectError.message}`)
    }

    console.log(`   ✅ Project created (ID: ${project.id})`)

    // Step 6: Create demo skeleton data
    console.log('6️⃣ Creating demo skeleton data...')
    const { error: skeletonError } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: authUser.user.id,
      p_org_id: org.id,
      p_project_id: project.id
    })

    if (skeletonError) {
      console.log(`   ⚠️ Skeleton creation warning: ${skeletonError.message}`)
      // Continue - skeleton may have partial data
    } else {
      console.log('   ✅ Demo skeleton created (5 areas, 5 systems, 10 packages, 4 welders)')
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 SHARED DEMO ACCOUNT CREATED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log(`
Credentials:
  Email:    ${DEMO_EMAIL}
  Password: ${DEMO_PASSWORD}

IDs (save these for configuration):
  User ID:         ${authUser.user.id}
  Organization ID: ${org.id}
  Project ID:      ${project.id}

Next Steps:
  1. Store these IDs in environment variables for the demo-access Edge Function
  2. Run populate-demo-data to add drawings and components (optional)
  3. Capture baseline snapshot for nightly reset (future feature)
`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
