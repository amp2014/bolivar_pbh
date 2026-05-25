import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import OnboardingModal from '../components/onboarding/OnboardingModal'
import WeatherCard from '../components/dashboard/WeatherCard'
import FerryCard from '../components/dashboard/FerryCard'
import WhosThereCard from '../components/dashboard/WhosThereCard'
import AnnouncementsCard from '../components/dashboard/AnnouncementsCard'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { profile, role, signOut, refreshProfile } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there'

  const avatarUrl = profile?.avatar_url
  const initials = (profile?.display_name ?? '?')
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
    <main className="page" style={{ paddingTop: 0 }}>

      {/* ── Header banner ─────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4d6b 55%, #1a5c6e 100%)',
        padding: 'calc(var(--safe-top) + 28px) 20px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative wave */}
        <svg
          viewBox="0 0 375 60"
          preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60px', opacity: 0.10 }}
        >
          <path d="M0 30 Q94 0 188 30 Q282 60 375 30 L375 60 L0 60 Z" fill="white" />
        </svg>

        {/* Avatar button — top right */}
        <button
          onClick={() => setShowProfile(true)}
          style={{
            position: 'absolute', top: 'calc(var(--safe-top) + 20px)', right: '20px',
            width: 38, height: 38, borderRadius: '50%',
            overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'white', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>{initials}</span>
          }
        </button>

        <p style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '13px',
          fontFamily: 'var(--font-body)',
          marginBottom: '3px',
          position: 'relative',
        }}>
          {greeting()}
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          color: 'white',
          fontSize: '28px',
          fontWeight: 700,
          lineHeight: 1.15,
          position: 'relative',
          marginBottom: '6px',
        }}>
          {firstName}
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.5px',
          position: 'relative',
        }}>
          604 NELSON AVE · BOLIVAR, TX
        </p>
      </div>

      {/* ── Profile sheet ─────────────────────────────────── */}
      {showProfile && (
        <>
          <div
            onClick={() => setShowProfile(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: 'white', borderRadius: '20px 20px 0 0',
            padding: '12px 24px calc(24px + var(--safe-bottom))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-sand-200)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--color-teal-xlight)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)' }}>{initials}</span>
                }
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--color-navy)' }}>
                  {profile?.display_name ?? 'Unknown'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {profile?.email} · <span style={{ textTransform: 'capitalize' }}>{role}</span>
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="btn btn-outline"
              style={{ width: '100%', height: '48px', fontSize: '15px', color: 'var(--color-coral)', borderColor: 'var(--color-coral)' }}
            >
              Sign out
            </button>
          </div>
        </>
      )}

      {/* ── Cards ─────────────────────────────────────────── */}
      <div className="page-inner" style={{ paddingTop: '16px' }}>

        {/* Row 1: Weather + Ferry */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '12px',
        }}>
          <WeatherCard />
          <FerryCard />
        </div>

        {/* Row 2: Who's There */}
        <div style={{ marginBottom: '12px' }}>
          <WhosThereCard />
        </div>

        {/* Row 3: Announcements */}
        <AnnouncementsCard />

        {/* Emergency Info link */}
        <Link to="/emergency" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', marginTop: '12px',
          background: 'white', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          borderLeft: '4px solid var(--color-coral)',
          textDecoration: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>🚨</span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>
                Emergency Info
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                Contacts, hospital, utilities
              </p>
            </div>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>›</span>
        </Link>

      </div>
    </main>

    {profile && profile.onboarded === false && (
      <OnboardingModal onComplete={refreshProfile} />
    )}
    </>
  )
}
