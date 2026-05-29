import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNavConfig } from '../contexts/NavConfigContext'

function useAddressSuggestions(query) {
  const [suggestions, setSuggestions] = useState([])
  const timerRef = useRef(null)
  useEffect(() => {
    if (query.trim().length < 4) { setSuggestions([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(data.map(r => r.display_name))
      } catch (_) {}
    }, 420)
    return () => clearTimeout(timerRef.current)
  }, [query])
  return suggestions
}

export default function SideNav({ onShowWelcomeGuide }) {
  const { profile, role, signOut, updateProfile } = useAuth()
  const { allFeatures }            = useNavConfig()
  const [hoveredKey, setHoveredKey] = useState(null)
  const [editingAddr, setEditingAddr] = useState(false)
  const [addrInput, setAddrInput]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [showSug, setShowSug]       = useState(true)
  const suggestions = useAddressSuggestions(addrInput)
  const navigate  = useNavigate()
  const location  = useLocation()

  async function saveAddress() {
    setSaving(true)
    const { error } = await updateProfile({ home_address: addrInput.trim() || null })
    setSaving(false)
    if (!error) { setEditingAddr(false); setShowSug(false) }
  }

  const avatarUrl = profile?.avatar_url
  const initials  = (profile?.display_name ?? '?')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  function isActive(feature) {
    if (feature.route === '/') return location.pathname === '/'
    return location.pathname === feature.route || location.pathname.startsWith(feature.route + '/')
  }

  return (
    <nav style={{
      width: '220px',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: '#0F4A63',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      zIndex: 100,
    }}>

      {/* ── App name header ─────────────────────────────── */}
      <div style={{
        padding: '24px 20px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          color: 'white',
          fontSize: '16px',
          fontWeight: 600,
          lineHeight: 1.35,
        }}>
          Phillips<br />Beach House
        </p>
      </div>

      {/* ── Nav items (all role-allowed features, no pinning on desktop) ── */}
      <div style={{ paddingTop: '8px', flexShrink: 0 }}>
        {allFeatures.map((feature) => {
          const active  = isActive(feature)
          const hovered = hoveredKey === feature.key
          return (
            <button
              key={feature.key}
              onClick={() => navigate(feature.route)}
              onMouseEnter={() => setHoveredKey(feature.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                margin: '2px 8px',
                borderRadius: '8px',
                width: 'calc(100% - 16px)',
                textAlign: 'left',
                border: 'none',
                color: active ? 'white' : 'rgba(255,255,255,0.6)',
                background: active
                  ? '#1B6B8A'
                  : hovered
                    ? 'rgba(255,255,255,0.1)'
                    : 'transparent',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                color: active ? 'var(--color-seafoam)' : 'rgba(255,255,255,0.6)',
                flexShrink: 0,
                lineHeight: 1,
              }}>
                {feature.icon(20)}
              </span>
              {feature.label}
            </button>
          )
        })}
      </div>

      {/* ── Spacer ──────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── User profile section ────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 20px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
            background: 'rgba(255,255,255,0.15)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>{initials}</span>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              color: 'white', fontSize: '13px', fontWeight: 600,
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {profile?.display_name ?? 'Unknown'}
            </p>
            <span style={{
              display: 'inline-block', fontSize: '10px',
              fontFamily: 'var(--font-mono)', color: 'var(--color-teal-light)',
              textTransform: 'capitalize', letterSpacing: '0.3px',
            }}>
              {role}
            </span>
          </div>
        </div>

        {/* ── Home address ── */}
        <div style={{ marginBottom: '12px' }}>
          {editingAddr ? (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={addrInput}
                onChange={e => { setAddrInput(e.target.value); setShowSug(true) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveAddress()
                  if (e.key === 'Escape') { setEditingAddr(false); setShowSug(false) }
                }}
                placeholder="123 Main St, City, TX"
                autoFocus
                autoComplete="off"
                style={{
                  width: '100%', height: '34px', padding: '0 10px',
                  borderRadius: showSug && suggestions.length > 0 ? '6px 6px 0 0' : '6px',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  fontFamily: 'var(--font-body)', fontSize: '12px',
                  color: 'white', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {showSug && suggestions.length > 0 && (
                <ul style={{
                  position: 'absolute', bottom: '34px', left: 0, right: 0,
                  background: '#0F4A63',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  borderBottom: 'none',
                  borderRadius: '6px 6px 0 0',
                  margin: 0, padding: 0, listStyle: 'none',
                  zIndex: 10, maxHeight: '160px', overflowY: 'auto',
                }}>
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      onMouseDown={e => { e.preventDefault(); setAddrInput(s); setShowSug(false) }}
                      style={{
                        padding: '8px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.85)',
                        fontFamily: 'var(--font-body)', cursor: 'pointer', lineHeight: 1.4,
                        borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  onClick={saveAddress}
                  disabled={saving}
                  style={{
                    flex: 1, height: '30px', borderRadius: '6px',
                    background: 'var(--color-teal)', border: 'none',
                    color: 'white', fontSize: '12px', fontFamily: 'var(--font-body)',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingAddr(false); setShowSug(false) }}
                  style={{
                    flex: 1, height: '30px', borderRadius: '6px',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                    color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <p style={{
                fontSize: '11px', fontFamily: 'var(--font-body)',
                color: profile?.home_address ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)',
                margin: 0, flex: 1, lineHeight: 1.3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {profile?.home_address ?? 'No home address'}
              </p>
              <button
                onClick={() => { setAddrInput(profile?.home_address ?? ''); setEditingAddr(true); setShowSug(true) }}
                style={{
                  fontSize: '11px', color: 'var(--color-teal-light)', fontWeight: 600,
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', flexShrink: 0, padding: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-teal-light)' }}
              >
                {profile?.home_address ? 'Edit' : 'Add'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={onShowWelcomeGuide}
            style={{
              fontSize: '12px', fontFamily: 'var(--font-body)',
              color: 'rgba(255,255,255,0.45)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
          >
            Welcome Guide
          </button>
          <button
            onClick={signOut}
            style={{
              fontSize: '12px', fontFamily: 'var(--font-body)',
              color: 'rgba(255,255,255,0.45)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
          >
            Sign out
          </button>
        </div>
      </div>

    </nav>
  )
}
