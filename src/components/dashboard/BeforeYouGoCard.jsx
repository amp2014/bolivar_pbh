import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveStay } from '../../hooks/useActiveStay'
import { getLowOrOutSupplies } from '../../services/supplies'

const MAX_VISIBLE = 4

export default function BeforeYouGoCard() {
  const { state, stay, daysUntil } = useActiveStay()
  const [items, setItems]           = useState(null) // null = loading
  const navigate                    = useNavigate()

  const shouldQuery =
    state === 'upcoming' && daysUntil !== null && daysUntil <= 3

  useEffect(() => {
    if (!shouldQuery) { setItems(null); return }
    getLowOrOutSupplies().then(setItems)
  }, [shouldQuery])

  // Gate: upcoming stay ≤3 days AND something low/out
  if (state === 'loading' || state === 'none' || state === 'active') return null
  if (!shouldQuery) return null
  if (!items || items.length === 0) return null

  const visible  = items.slice(0, MAX_VISIBLE)
  const overflow = items.length - MAX_VISIBLE

  const label = daysUntil === 0
    ? 'Your stay starts today'
    : daysUntil === 1
      ? 'Your stay starts tomorrow'
      : `Your stay starts in ${daysUntil} days`

  return (
    <button
      onClick={() => navigate('/house')}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'white',
        borderRadius: 'var(--radius-md)',
        border: '1.5px solid var(--color-border)',
        borderLeft: '4px solid var(--color-coral)',
        padding: '14px 16px',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '0',
      }}
    >
      {/* Label */}
      <p style={{
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--color-coral)',
        fontWeight: 700,
        marginBottom: '6px',
      }}>
        Before You Go
      </p>

      {/* Headline */}
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '16px',
        fontWeight: 700,
        color: 'var(--color-navy)',
        lineHeight: 1.3,
        marginBottom: '12px',
      }}>
        {label} — these are low or out:
      </p>

      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visible.map((item) => {
          const isOut = item.status === 'out'
          return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '8px',
              }}
            >
              <span style={{
                fontSize: '14px', fontWeight: 500,
                color: 'var(--color-navy)', fontFamily: 'var(--font-body)',
              }}>
                {item.name}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
                padding: '2px 8px', borderRadius: 'var(--radius-full)',
                background: isOut ? '#fdecea' : '#fff8e1',
                color: isOut ? 'var(--color-coral)' : '#b8860b',
                flexShrink: 0,
              }}>
                {isOut ? 'OUT' : 'LOW'}
              </span>
            </div>
          )
        })}

        {overflow > 0 && (
          <p style={{
            fontSize: '12px', color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)', marginTop: '2px',
          }}>
            and {overflow} more →
          </p>
        )}
      </div>

      {/* Tap hint */}
      <p style={{
        fontSize: '11px', color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-body)', marginTop: '10px',
      }}>
        Tap to view house supplies
      </p>
    </button>
  )
}
