import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 32 32" style={{ margin: '0 auto 16px' }}>
            <rect width="32" height="32" rx="6" fill="#1a3a5c"/>
            <path d="M4 22 Q10 14 16 18 Q22 22 28 14" stroke="#2ab8c4" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </svg>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
            Loading…
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
