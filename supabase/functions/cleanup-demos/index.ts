// Cleanup Expired Demo Users Edge Function
// Feature: 021-public-homepage
// Task: T012
// Description: Delete expired demo users and their associated data (called daily by pg_cron)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const startTime = Date.now()

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Find expired demo users
    const { data: expiredUsers, error: queryError } = await supabase
      .from('users')
      .select('id, email, demo_expires_at')
      .eq('is_demo_user', true)
      .lt('demo_expires_at', new Date().toISOString())

    if (queryError) {
      console.error('Error querying expired users:', queryError)
      throw new Error('Failed to query expired demo users')
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log('No expired demo users found')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No expired demo users to cleanup',
          deleted_count: 0,
          duration_ms: Date.now() - startTime
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    console.log(`Found ${expiredUsers.length} expired demo users`)

    // 2. Delete each expired user (cascades to organizations, projects, components, etc.)
    const deletedUsers: string[] = []
    const failedUsers: Array<{ id: string; email: string; error: string }> = []

    for (const user of expiredUsers) {
      try {
        // Delete from auth.users (this will cascade to public.users via trigger)
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id)

        if (authDeleteError) {
          console.error(`Failed to delete auth user ${user.email}:`, authDeleteError)
          failedUsers.push({
            id: user.id,
            email: user.email,
            error: authDeleteError.message
          })
          continue
        }

        // Verify cascade deletion happened (public.users should be gone)
        const { data: userStillExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (userStillExists) {
          // Manually delete from public.users if cascade didn't work
          console.warn(`Manual cleanup required for user ${user.email}`)

          const { error: manualDeleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id)

          if (manualDeleteError) {
            console.error(`Failed to manually delete user ${user.email}:`, manualDeleteError)
            failedUsers.push({
              id: user.id,
              email: user.email,
              error: manualDeleteError.message
            })
            continue
          }
        }

        deletedUsers.push(user.id)
        console.log(`Deleted expired demo user: ${user.email} (expired at ${user.demo_expires_at})`)
      } catch (error) {
        console.error(`Error deleting user ${user.email}:`, error)
        failedUsers.push({
          id: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const duration = Date.now() - startTime

    // 3. Return cleanup summary
    const response = {
      success: true,
      message: `Cleanup complete: deleted ${deletedUsers.length} of ${expiredUsers.length} expired demo users`,
      deleted_count: deletedUsers.length,
      failed_count: failedUsers.length,
      failed_users: failedUsers.length > 0 ? failedUsers : undefined,
      duration_ms: duration
    }

    console.log('Cleanup summary:', response)

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Cleanup error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'CLEANUP_ERROR',
        message: 'Failed to cleanup expired demo users',
        error_code: error instanceof Error ? error.message : 'UNKNOWN'
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
