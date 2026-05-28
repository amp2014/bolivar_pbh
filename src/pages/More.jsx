import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNavConfig } from '../contexts/NavConfigContext'

export default function More() {
  const navigate       = useNavigate()
  const { overflow }   = useNavConfig()
  const { profile, role, signOut } = useAuth()

  const avatarUrl = profile?.avatar_url
  const initials  = (profile?.display_name ?? '?')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <style>{`
        .more-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding: 0 16px;
        }
        @media (min-width: 480px) { .more-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 640px) { .more-grid { grid-template-columns: repeat(5, 1fr); } }
        .more-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 100px;
          border-radius: 14px;
          background: var(--color-sand-100, #F5EDD8);
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          cursor: pointer;
          padding: 14px 8px;
          border: none;
          transition: transform 0.12s, box-shadow 0.12s;
          -webkit-tap-highlight-color: transparent;
        }
        .more-tile:active { transform: scale(0.96); box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
        @media (hover: hover) {
          .more-tile:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        }
      `}</style>

      <div style={{
        paddingTop: 'calc(var(--safe-top, 0px) + 20px)',
        paddingBottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom, 0px) + 24px)',
        minHeight: '100vh',
      }}>

        {/* ── Header ── */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--color-navy)',
          padding: '0 16px 20px',
          margin: 0,
        }}>
          More
        </h1>

        {/* ── Feature grid ── */}
        {overflow.length === 0 ? (
          <p style={{
            padding: '24px 16px',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)',
            textAlign: 'center',
          }}>
            Everything's pinned to your bar.
          </p>
        ) : (
          <div className="more-grid">
            {overflow.map((feature) => (
              <button
                key={feature.key}
                className="more-tile"
                onClick={() => navigate(feature.route)}
              >
                <span style={{ color: 'var(--color-navy)', lineHeight: 1 }}>
                  {feature.icon(28)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-navy)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}>
                  {feature.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Profile / sign-out footer ── */}
        <div style={{
          margin: '28px 16px 0',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--color-teal-xlight, #e8f4f8)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>{initials}</span>
              }
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--color-navy)', margin: 0 }}>
                {profile?.display_name ?? 'Unknown'}
              </p>
              <span style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)',
                color: 'var(--color-teal)', textTransform: 'capitalize',
                letterSpacing: '0.3px',
              }}>
                {role}
              </span>
            </div>
          </div>

          <button
            onClick={signOut}
            style={{
              width: '100%', height: '46px',
              border: '1.5px solid var(--color-coral, #e85d4a)',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              color: 'var(--color-coral, #e85d4a)',
              fontSize: '15px', fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Sign out
          </button>
        </div>

      </div>
    </>
  )
}
