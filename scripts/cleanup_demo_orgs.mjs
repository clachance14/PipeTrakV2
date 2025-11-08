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

console.log('🔍 Finding demo organizations...\n')

const { data: orgs, error: fetchError } = await supabase
  .from('organizations')
  .select('id, name')
  .like('name', 'Demo -%')

if (fetchError) {
  console.error('❌ Error fetching organizations:', fetchError.message)
  process.exit(1)
}

if (!orgs || orgs.length === 0) {
  console.log('✅ No demo organizations found.')
  process.exit(0)
}

console.log(`Found ${orgs.length} demo organization(s):\n`)
orgs.forEach((org, index) => {
  console.log(`${index + 1}. ${org.name} (${org.id})`)
})

console.log('\n⚠️  DELETING ALL DEMO ORGANIZATIONS (cascades to projects/components)...\n')

let successCount = 0
let failCount = 0

for (const org of orgs) {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', org.id)

  if (error) {
    failCount++
    console.log(`  ❌ ${org.name}: ${error.message}`)
  } else {
    successCount++
    console.log(`  ✅ ${org.name}: Deleted`)
  }
}

console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`)
console.log('✅ Cleanup complete!')
