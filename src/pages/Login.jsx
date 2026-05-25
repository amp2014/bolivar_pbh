import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { session, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, var(--color-navy) 0%, var(--color-navy-mid) 50%, #1a5c6e 100%)',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      {/* Wave decoration */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <svg viewBox="0 0 375 200" style={{ position: 'absolute', bottom: 0, width: '100%', opacity: 0.12 }}>
          <path d="M0 100 Q94 40 188 100 Q282 160 375 100 L375 200 L0 200 Z" fill="white"/>
          <path d="M0 130 Q94 70 188 130 Q282 190 375 130 L375 200 L0 200 Z" fill="white" opacity="0.5"/>
        </svg>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '360px', width: '100%' }}>
        {/* Logo */}
        <div style={{ marginBottom: '12px' }}>
          <svg width="64" height="64" viewBox="0 0 32 32" style={{ margin: '0 auto' }}>
            <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.15)"/>
            <path d="M4 22 Q10 14 16 18 Q22 22 28 14" stroke="#2ab8c4" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M4 26 Q10 18 16 22 Q22 26 28 18" stroke="#2ab8c4" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
            <circle cx="22" cy="9" r="4" fill="#f5a623" opacity="0.9"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          color: 'white',
          fontSize: '28px',
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: '8px',
        }}>
          Phillips<br />Beach House
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: '14px',
          marginBottom: '48px',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.5px',
        }}>
          604 Nelson Ave · Bolivar, TX
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 24px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '15px',
            marginBottom: '24px',
            fontFamily: 'var(--font-body)',
          }}>
            Sign in to manage the house, check bookings, and more.
          </p>

          <button
            onClick={signInWithGoogle}
            className="btn"
            style={{
              width: '100%',
              background: 'white',
              color: '#1c2b3a',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              fontSize: '15px',
              gap: '10px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <p style={{
          marginTop: '24px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '12px',
          fontFamily: 'var(--font-body)',
        }}>
          Phillips family only · Guests receive a link from the admin
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
