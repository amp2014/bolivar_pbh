import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const GCAL_KEY     = 'pbh_gcal_token'
const GCAL_EXP_KEY = 'pbh_gcal_token_exp'

function cacheProviderToken(token) {
  if (!token) return
  localStorage.setItem(GCAL_KEY, token)
  // Google access tokens last 3600s; cache for 58 min to allow a safe margin
  localStorage.setItem(GCAL_EXP_KEY, String(Date.now() + 58 * 60 * 1000))
}

function getCachedProviderToken() {
  const token = localStorage.getItem(GCAL_KEY)
  const exp   = parseInt(localStorage.getItem(GCAL_EXP_KEY) || '0', 10)
  return token && Date.now() < exp ? token : null
}

function clearCachedProviderToken() {
  localStorage.removeItem(GCAL_KEY)
  localStorage.removeItem(GCAL_EXP_KEY)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) cacheProviderToken(session.provider_token)
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.provider_token) cacheProviderToken(session.provider_token)
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) console.error('Google sign-in error:', error.message)
  }

  async function refreshProfile() {
    if (session?.user?.id) await fetchProfile(session.user.id)
  }

  async function updateProfile(changes) {
    if (!session?.user?.id) return { error: new Error('No session') }
    const { error } = await supabase.from('users').update(changes).eq('id', session.user.id)
    if (!error) await fetchProfile(session.user.id)
    return { error }
  }

  async function signOut() {
    clearCachedProviderToken()
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? 'guest',
    isAdmin: profile?.role === 'admin',
    isFamily: profile?.role === 'family' || profile?.role === 'admin',
    loading: session === undefined,
    providerToken: session?.provider_token ?? getCachedProviderToken(),
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
