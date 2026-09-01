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
      setLoading(false)
      return
    }
    if (!supabase) {
      setLoading(false)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setProfile(data)
      } else {
        // Fallback: If trigger was delayed or profile row is missing, check auth user metadata
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user
        if (user && user.id === userId) {
          const rawRole = user.user_metadata?.role || user.app_metadata?.role || 'worker'
          const cleanRole = ['worker', 'employer', 'admin'].includes(rawRole) ? rawRole : 'worker'
          const rawName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
          
          // Attempt upsert fallback
          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              full_name: rawName,
              role: cleanRole,
            })
            .select()
            .single()

          if (newProfile) {
            setProfile(newProfile)
          } else {
            setProfile({
              id: userId,
              full_name: rawName,
              role: cleanRole,
              earnings: 0,
              pending: 0,
              spent: 0,
              deposited: 0,
            })
          }
        } else {
          setProfile(null)
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
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

  const signUp = async ({ email, password, fullName, role, referralCode }) => {
    if (!supabase) throw new Error('The sign-in service is not configured yet.')
    const trimmedRef = referralCode ? String(referralCode).trim().toUpperCase() : undefined
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          referral_code: trimmedRef || undefined,
          ref: trimmedRef || undefined,
        },
      },
    })
    if (error) throw error
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
    setProfile(null)
    setSession(null)
    setLoading(false)
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
