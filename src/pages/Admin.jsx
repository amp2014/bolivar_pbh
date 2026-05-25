import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import UserList from '../components/admin/UserList'
import AppSettings from '../components/admin/AppSettings'
import BookingLog from '../components/admin/BookingLog'

const TABS = ['Users', 'Bookings', 'Settings']

export default function Admin() {
  const { isAdmin } = useAuth()
  const [section, setSection] = useState('Users')

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <main className="page" style={{ paddingTop: 0 }}>

      {/* Header */}
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

      <div className="page-inner" style={{ paddingTop: '16px' }}>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--color-sand-100)',
          borderRadius: 'var(--radius-full)',
          padding: '4px', marginBottom: '20px',
        }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setSection(t)} style={{
              flex: 1, height: '36px',
              borderRadius: 'var(--radius-full)', border: 'none',
              background: section === t ? 'white' : 'transparent',
              color: section === t ? 'var(--color-navy)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-body)', fontSize: '14px',
              fontWeight: section === t ? 600 : 400, cursor: 'pointer',
              boxShadow: section === t ? 'var(--shadow-card)' : 'none',
              transition: 'all 0.15s',
            }}>
              {t === 'Users' ? '👤  Users' : t === 'Bookings' ? '📋  Bookings' : '⚙️  Settings'}
            </button>
          ))}
        </div>

        {section === 'Users'    && <UserList />}
        {section === 'Bookings' && <BookingLog />}
        {section === 'Settings' && <AppSettings />}

      </div>
    </main>
  )
}
