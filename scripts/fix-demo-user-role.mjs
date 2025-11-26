/**
 * Fix Demo User Role
 * Updates the demo user to have the 'foreman' role so they can update field welds
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let serviceKey = ''

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceKey = line.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function main() {
  console.log('🔧 Updating demo user role...\n')

  // Update demo user to have 'foreman' role (can update field welds)
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'foreman' })
    .eq('email', 'demo@pipetrak.co')
    .select('id, email, role')
    .single()

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log('✅ Demo user role updated!')
  console.log(`   ID: ${data.id}`)
  console.log(`   Email: ${data.email}`)
  console.log(`   Role: ${data.role}`)
}

main()
