import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNavConfig } from '../contexts/NavConfigContext'

export default function SideNav({ onShowWelcomeGuide }) {
  const { profile, role, signOut } = useAuth()
  const { allFeatures }            = useNavConfig()
  const [hoveredKey, setHoveredKey] = useState(null)
  const navigate  = useNavigate()
  const location  = useLocation()

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
