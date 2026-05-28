import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLayout } from '../contexts/LayoutContext'
import UserList from '../components/admin/UserList'
import AppSettings from '../components/admin/AppSettings'
import BookingLog from '../components/admin/BookingLog'
import NavBarCustomizer from '../components/admin/NavBarCustomizer'

const TABS = [
  { key: 'Users',    label: 'Users',    icon: '👤' },
  { key: 'Bookings', label: 'Bookings', icon: '📋' },
  { key: 'Nav',      label: 'Nav Bar',  icon: '🧭' },
  { key: 'Settings', label: 'Settings', icon: '⚙️' },
]

export default function Admin() {
  const { isAdmin } = useAuth()
  const { isDesktop } = useLayout()
  const [section, setSection] = useState('Users')

  if (!isAdmin) return <Navigate to="/" replace />

  const pageHeader = (
    <div style={{
      background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4d6b 55%, #1a5c6e 100%)',
      padding: 'calc(var(--safe-top) + 28px) 20px 28px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <svg viewBox="0 0 375 60" preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60px', opacity: 0.10 }}>
        <path d="M0 30 Q94 0 188 30 Q282 60 375 30 L375 60 L0 60 Z" fill="white" />
      </svg>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontFamily: 'var(--font-body)', marginBottom: '3px', position: 'relative' }}>
        Phillips Beach House
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '28px', fontWeight: 700, lineHeight: 1.15, position: 'relative' }}>
        Admin
      </h1>
    </div>
  )

  const sectionContent = (
    <>
      {section === 'Users'    && <UserList isDesktop={isDesktop} />}
      {section === 'Bookings' && <BookingLog isDesktop={isDesktop} />}
      {section === 'Nav'      && <NavBarCustomizer />}
      {section === 'Settings' && <AppSettings />}
    </>
  )

  // ── Desktop: sidebar nav + content panel ────────────────────
  if (isDesktop) {
    return (
      <main className="page" style={{ paddingTop: 0 }}>
        {pageHeader}
        <div style={{ display: 'flex', gap: '0', alignItems: 'flex-start', padding: '24px' }}>

          {/* Left nav sidebar */}
          <div style={{ width: '180px', flexShrink: 0, paddingRight: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {TABS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', textAlign: 'left',
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: section === key ? 'var(--color-navy)' : 'transparent',
                    color: section === key ? 'white' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)', fontSize: '14px',
                    fontWeight: section === key ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (section !== key) e.currentTarget.style.background = 'var(--color-sand-100)'
                  }}
                  onMouseLeave={(e) => {
                    if (section !== key) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right content panel */}
          <div style={{
            flex: 1, minWidth: 0,
            borderLeft: '1px solid var(--color-border)',
            paddingLeft: '24px',
          }}>
            {sectionContent}
          </div>

        </div>
      </main>
    )
  }

  // ── Mobile: tab bar ─────────────────────────────────────────
  return (
    <main className="page" style={{ paddingTop: 0 }}>
      {pageHeader}
      <div className="page-inner" style={{ paddingTop: '16px' }}>

        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--color-sand-100)',
          borderRadius: 'var(--radius-full)',
          padding: '4px', marginBottom: '20px',
          overflowX: 'auto',
        }}>
          {TABS.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setSection(key)} style={{
              flex: '0 0 auto', height: '36px', padding: '0 12px',
              borderRadius: 'var(--radius-full)', border: 'none',
              background: section === key ? 'white' : 'transparent',
              color: section === key ? 'var(--color-navy)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-body)', fontSize: '13px',
              fontWeight: section === key ? 600 : 400, cursor: 'pointer',
              boxShadow: section === key ? 'var(--shadow-card)' : 'none',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}>
              {icon}  {label}
            </button>
          ))}
        </div>

        {sectionContent}

      </div>
    </main>
  )
}
