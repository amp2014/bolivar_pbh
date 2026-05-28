import { useLocation, useNavigate } from 'react-router-dom'
import { useLayout } from '../contexts/LayoutContext'
import { useNavConfig } from '../contexts/NavConfigContext'

const MoreIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5"  cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
)

export default function BottomNav() {
  const { isDesktop }           = useLayout()
  const { pinned, overflow }    = useNavConfig()
  const location                = useLocation()
  const navigate                = useNavigate()

  if (isDesktop) return null

  const pathname = location.pathname

  // More is active when on /more OR on any overflow-feature route
  const overflowRoutes = overflow.map(f => f.route)
  const moreActive =
    pathname === '/more' ||
    pathname.startsWith('/more/') ||
    overflowRoutes.some(r => r !== '/' && pathname.startsWith(r))

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'calc(var(--nav-height) + var(--safe-bottom))',
      paddingBottom: 'var(--safe-bottom)',
      background: 'white',
      boxShadow: 'var(--shadow-nav)',
      display: 'flex',
      zIndex: 100,
    }}>

      {/* Pinned slots (Home + up to 3) */}
      {pinned.map((feature) => {
        const isRoot = feature.route === '/'
        const isActive = isRoot
          ? pathname === '/'
          : pathname === feature.route || pathname.startsWith(feature.route + '/')
        return (
          <button
            key={feature.key}
            onClick={() => navigate(feature.route)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              color: isActive ? 'var(--color-navy)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: isActive ? 600 : 400,
              minHeight: '44px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ color: isActive ? 'var(--color-teal)' : 'var(--color-text-muted)', lineHeight: 1 }}>
              {feature.icon(24)}
            </span>
            <span>{feature.label}</span>
          </button>
        )
      })}

      {/* More slot (always last, slot 5) */}
      <button
        onClick={() => navigate('/more')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          color: moreActive ? 'var(--color-navy)' : 'var(--color-text-muted)',
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: moreActive ? 600 : 400,
          minHeight: '44px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          transition: 'color 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ color: moreActive ? 'var(--color-teal)' : 'var(--color-text-muted)', lineHeight: 1 }}>
          {MoreIcon}
        </span>
        <span>More</span>
      </button>

    </nav>
  )
}
