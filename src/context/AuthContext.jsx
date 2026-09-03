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
        // Strict worker referral verification & self-healing
        if (data.role === 'worker') {
          let needsUpdate = false
          const updates = {}

          // 1. Ensure worker has a persistent unique referral code stored in DB
          if (!data.referral_code) {
            const cleanPrefix = (data.full_name || 'WORK')
              .replace(/[^a-zA-Z]/g, '')
              .slice(0, 4)
              .toUpperCase()
              .padEnd(4, 'X')
            const cleanDigits = (userId.replace(/[^0-9]/g, '').slice(0, 4) || '8021').padEnd(4, '0')
            updates.referral_code = `${cleanPrefix}${cleanDigits}`
            data.referral_code = updates.referral_code
            needsUpdate = true
          }

          // 2. Ensure referred_by is linked if user registered through a referral link
          if (!data.referred_by) {
            try {
              const { data: userData } = await supabase.auth.getUser()
              const userMeta = userData?.user?.user_metadata || {}
              let candidateRefCode =
                userMeta.referral_code ||
                userMeta.ref ||
                userMeta.referred_by ||
                null

              if (!candidateRefCode && typeof window !== 'undefined') {
                try {
                  candidateRefCode = localStorage.getItem('taskly_ref_code')
                } catch (e) {}
              }

              if (candidateRefCode && typeof candidateRefCode === 'string') {
                const cleanRef = candidateRefCode.trim().toUpperCase()
                const { data: referrer } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('role', 'worker')
                  .ilike('referral_code', cleanRef)
                  .neq('id', userId)
                  .maybeSingle()

                if (referrer?.id) {
                  updates.referred_by = referrer.id
                  data.referred_by = referrer.id
                  needsUpdate = true
                  try {
                    localStorage.removeItem('taskly_ref_code')
                  } catch (e) {}
                }
              }
            } catch (err) {
              console.warn('Referral resolution note:', err)
            }
          }

          if (needsUpdate) {
            await supabase.from('profiles').update(updates).eq('id', userId)
          }
        }

        setProfile({ ...data })
      } else {
        // Fallback: If trigger was delayed or profile row is missing, check auth user metadata
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user
        if (user && user.id === userId) {
          const rawRole = user.user_metadata?.role || user.app_metadata?.role || 'worker'
          const cleanRole = ['worker', 'employer', 'admin'].includes(rawRole) ? rawRole : 'worker'
          const rawName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
          
          let myRefCode = null
          let myReferredById = null

          if (cleanRole === 'worker') {
            const cleanPrefix = rawName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X')
            const cleanDigits = (userId.replace(/[^0-9]/g, '').slice(0, 4) || '8021').padEnd(4, '0')
            myRefCode = `${cleanPrefix}${cleanDigits}`

            const candidateRef = (
              user.user_metadata?.referral_code ||
              user.user_metadata?.ref ||
              (typeof window !== 'undefined' ? localStorage.getItem('taskly_ref_code') : null) ||
              ''
            ).trim().toUpperCase()

            if (candidateRef) {
              const { data: refProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'worker')
                .ilike('referral_code', candidateRef)
                .neq('id', userId)
                .maybeSingle()

              if (refProfile?.id) {
                myReferredById = refProfile.id
              }
            }
          }

          // Attempt upsert fallback
          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              full_name: rawName,
              role: cleanRole,
              referral_code: myRefCode,
              referred_by: myReferredById,
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
              referral_code: myRefCode,
              referred_by: myReferredById,
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
