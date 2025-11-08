// Diagnostic script to test signup flow and email configuration
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('=== Signup Flow Diagnostics ===\n')
console.log('Supabase URL:', supabaseUrl)

// Test signup with a test email
const testEmail = `testuser${Date.now()}@gmail.com`
const testPassword = 'testpass123'

console.log('\n1. Testing signup with test email:', testEmail)

const { data, error } = await supabase.auth.signUp({
  email: testEmail,
  password: testPassword,
  options: {
    data: {
      full_name: 'Test User',
      organization_name: 'Test Org'
    }
  }
})

if (error) {
  console.error('❌ Signup error:', error.message)
} else {
  console.log('\n✅ Signup response:')
  console.log('  User ID:', data.user?.id)
  console.log('  Email:', data.user?.email)
  console.log('  Email confirmed:', data.user?.email_confirmed_at ? 'YES' : 'NO')
  console.log('  Session exists:', data.session ? 'YES' : 'NO')
  console.log('  Confirmation sent at:', data.user?.confirmation_sent_at || 'N/A')

  if (data.session) {
    console.log('\n✅ AUTO-CONFIRMED: User has immediate session (no email confirmation required)')
  } else {
    console.log('\n⚠️  EMAIL CONFIRMATION REQUIRED: User must confirm email before logging in')
    console.log('  Expected behavior: User should receive confirmation email')
    console.log('  Issue: If no email is received, Supabase email provider is not configured')
  }
}

console.log('\n2. Checking Supabase email configuration...')
console.log('  Regular signup uses Supabase\'s built-in email system')
console.log('  Demo signup uses Resend API (custom Edge Function)')
console.log('\n  To fix email issues for regular signup:')
console.log('  → Go to Supabase Dashboard > Authentication > Email Templates')
console.log('  → Check SMTP settings or configure a custom SMTP provider')
console.log('  → Or disable email confirmation (not recommended for production)')

console.log('\n=== End Diagnostics ===')
