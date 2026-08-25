import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error) setProfile(data)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return undefined
    }

    // Initial load: wait for the profile (role) to finish loading
    // BEFORE flipping `loading` to false. Otherwise RoleRedirect reads
    // `role` while it's still null and defaults everyone to /worker.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        await loadProfile(session.user.id)
      }
      setLoading(false)
    })

    // Fires on sign-in / sign-out / token refresh.
    // Same fix here: keep `loading` true while the profile/role is
    // being fetched right after a fresh sign-in, so a just-logged-in
    // Employer doesn't get redirected to /worker before their role
    // has arrived.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setLoading(true)
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  // Realtime: keep profile (wallet balances) live without polling
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session?.user?.id) return undefined

    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        () => loadProfile(session.user.id)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id, loadProfile])

  const signUp = async ({ email, password, fullName, role }) => {
    if (!supabase) throw new Error('The sign-in service is not configured yet.')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    if (error) throw error
    // profile row is created by a DB trigger (see supabase/schema.sql handle_new_user)
    return data
  }

  const signIn = async ({ email, password }) => {
    if (!supabase) throw new Error('The sign-in service is not configured yet.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  const refreshProfile = () => loadProfile(session?.user?.id)

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
