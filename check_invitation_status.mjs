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

// Get the most recent invitation for clachance@ics.ac
const { data: invitations } = await supabase
  .from('invitations')
  .select('*')
  .eq('email', 'clachance@ics.ac')
  .order('created_at', { ascending: false })
  .limit(1)

if (invitations && invitations.length > 0) {
  const inv = invitations[0]
  console.log('Current invitation status:', inv.status)
  console.log('ID:', inv.id)
  console.log('Email:', inv.email)
  console.log('Created:', inv.created_at)
  console.log('Accepted at:', inv.accepted_at)
  
  if (inv.status === 'pending') {
    console.log('\n⚠️  Invitation is still pending but user is authenticated')
    console.log('Updating to accepted...')
    
    const { error } = await supabase
      .from('invitations')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString() 
      })
      .eq('id', inv.id)
    
    if (error) {
      console.log('❌ Failed to update:', error.message)
    } else {
      console.log('✅ Invitation marked as accepted')
    }
  }
} else {
  console.log('No invitation found')
}
