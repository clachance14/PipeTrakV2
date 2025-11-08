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

const userId = 'a6e9cd47-b2be-44ec-8f92-5d9e8fe618d9'
const email = 'clachance@ics.ac'

console.log('Getting invitation for', email)

const { data: invitations } = await supabase
  .from('invitations')
  .select('organization_id, role, status')
  .eq('email', email)
  .order('created_at', { ascending: false })
  .limit(1)

if (invitations && invitations.length > 0) {
  const inv = invitations[0]
  console.log('Invitation found:')
  console.log('- Organization ID:', inv.organization_id)
  console.log('- Role:', inv.role)
  console.log('- Status:', inv.status)
  
  console.log('\nUpdating user record...')
  const { error } = await supabase
    .from('users')
    .update({
      organization_id: inv.organization_id,
      role: inv.role
    })
    .eq('id', userId)
  
  if (error) {
    console.log('❌ Failed:', error.message)
  } else {
    console.log('✅ User organization and role set!')
    console.log('\n👤 User should now appear in team list')
  }
} else {
  console.log('❌ No invitation found')
}
