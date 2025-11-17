import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/types/team.types'

type AuthContextType = {
  session: Session | null
  user: (User & { role?: Role }) | null
  loading: boolean
  isInRecoveryMode: boolean
  setIsInRecoveryMode: (value: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<(User & { role?: Role }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInRecoveryMode, setIsInRecoveryMode] = useState(false)

  // Fetch user role from public.users table
  const fetchUserRole = async (authUser: User | null) => {
    if (!authUser) {
      setUser(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Error fetching user role:', error)
        // If error fetching role, set user without role
        setUser({ ...authUser, role: undefined } as User & { role?: Role })
        return
      }

      // Cast the user with the role to our extended type
      setUser({ ...authUser, role: data?.role as Role | undefined } as User & { role?: Role })
    } catch (err) {
      console.error('Error fetching user role:', err)
      setUser({ ...authUser, role: undefined } as User & { role?: Role })
    }
  }

  useEffect(() => {
    // CRITICAL: Detect recovery token IMMEDIATELY before any async operations
    // This prevents race condition with HomePage redirect
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('type=magiclink')) {
      setIsInRecoveryMode(true)
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      fetchUserRole(session?.user ?? null).finally(() => setLoading(false))
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Detect password recovery mode
      if (event === 'PASSWORD_RECOVERY') {
        setIsInRecoveryMode(true)
      }

      setSession(session)
      fetchUserRole(session?.user ?? null).finally(() => setLoading(false))
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      // If sign out fails (e.g., 403 from recovery session), log but continue
      // We still want to clear local state and redirect
      console.warn('Sign out error (continuing anyway):', error)
    } finally {
      // Always clear local state, even if Supabase signOut failed
      setSession(null)
      setUser(null)
      setIsInRecoveryMode(false)
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, isInRecoveryMode, setIsInRecoveryMode, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
