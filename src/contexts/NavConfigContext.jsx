import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { FEATURES, FEATURES_LIST } from '../config/navFeatures'
import { useAuth } from './AuthContext'

const NavConfigContext = createContext(null)

function isAllowed(feature, role) {
  if (feature.roles.includes('all')) return true
  if (feature.roles.includes('family') && (role === 'family' || role === 'admin')) return true
  if (feature.roles.includes('admin') && role === 'admin') return true
  return false
}

export function NavConfigProvider({ children }) {
  const { role, loading: authLoading } = useAuth()
  const [rawPinnedKeys, setRawPinnedKeys] = useState(['stays', 'fishing', 'local'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchErr } = await supabase
      .from('nav_settings')
      .select('pinned_items')
      .single()
    if (!fetchErr && Array.isArray(data?.pinned_items)) {
      setRawPinnedKeys(data.pinned_items)
    }
    if (fetchErr) setError(fetchErr)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchConfig()
  }, [authLoading, fetchConfig])

  // Re-fetch when window regains focus (catches admin changes from another session)
  useEffect(() => {
    window.addEventListener('focus', fetchConfig)
    return () => window.removeEventListener('focus', fetchConfig)
  }, [fetchConfig])

  const allowedFeatures = FEATURES_LIST.filter(f => isAllowed(f, role))
  const allowedKeys     = new Set(allowedFeatures.map(f => f.key))

  // pinned = [home] + up to 3 valid pinned keys (role-allowed, known key, not 'home')
  const pinnedMiddle = rawPinnedKeys
    .filter(k => k !== 'home' && allowedKeys.has(k) && FEATURES[k])
    .slice(0, 3)
    .map(k => FEATURES[k])

  const pinned       = [FEATURES.home, ...pinnedMiddle]
  const pinnedKeySet = new Set(['home', ...pinnedMiddle.map(f => f.key)])
  const overflow     = allowedFeatures.filter(f => !pinnedKeySet.has(f.key))

  const value = {
    pinned,
    overflow,
    allFeatures: allowedFeatures,
    rawPinnedKeys,          // the stored array (for admin customizer)
    loading,
    error,
    refetch: fetchConfig,
  }

  return (
    <NavConfigContext.Provider value={value}>
      {children}
    </NavConfigContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavConfig() {
  const ctx = useContext(NavConfigContext)
  if (!ctx) throw new Error('useNavConfig must be inside NavConfigProvider')
  return ctx
}
