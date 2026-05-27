import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const BASE_TABS = [
  {
    to: '/',
    label: 'Home',
    end: true,
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    to: '/stays',
    label: 'Stays',
    end: false,
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    to: '/house',
    label: 'House',
    end: false,
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    to: '/local',
    label: 'Local',
    end: false,
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="4"/>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      </svg>
    ),
  },
  {
    to: '/photos',
    label: 'Photos',
    end: false,
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ),
  },
]

const ADMIN_TAB = {
  to: '/admin',
  label: 'Admin',
  end: false,
  icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
}

export default function SideNav() {
  const { profile, role, isAdmin, signOut } = useAuth()
  const [hoveredTo, setHoveredTo] = useState(null)

  const tabs = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS

  const avatarUrl = profile?.avatar_url
  const initials = (profile?.display_name ?? '?')
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

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

      {/* ── Nav items ───────────────────────────────────── */}
      <div style={{ paddingTop: '8px', flexShrink: 0 }}>
        {tabs.map(({ to, label, end, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onMouseEnter={() => setHoveredTo(to)}
            onMouseLeave={() => setHoveredTo(null)}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              margin: '2px 8px',
              borderRadius: '8px',
              color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
              background: isActive
                ? '#1B6B8A'
                : hoveredTo === to
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  color: isActive ? 'var(--color-seafoam)' : 'rgba(255,255,255,0.6)',
                  flexShrink: 0,
                  lineHeight: 1,
                }}>
                  {icon(isActive)}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.15)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>{initials}</span>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {profile?.display_name ?? 'Unknown'}
            </p>
            <span style={{
              display: 'inline-block',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-teal-light)',
              textTransform: 'capitalize',
              letterSpacing: '0.3px',
            }}>
              {role}
            </span>
          </div>
        </div>

        <button
          onClick={signOut}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-body)',
            color: 'rgba(255,255,255,0.45)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
        >
          Sign out
        </button>
      </div>

    </nav>
  )
}
