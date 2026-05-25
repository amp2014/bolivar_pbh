import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function initials(name) {
  return (name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatRange(start, end) {
  const fmt = (d) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

// Cycle through teal shades for avatars when no photo
const avatarColors = [
  { bg: '#e0f7fa', fg: '#1a3a5c' },
  { bg: '#d4f0e8', fg: '#1a3a5c' },
  { bg: '#fde8d8', fg: '#1a3a5c' },
  { bg: '#e8dfc8', fg: '#1a3a5c' },
]

export default function WhosThereCard() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('bookings')
      .select('id, guest_name, start_date, end_date, party_size')
      .lte('start_date', today)
      .gte('end_date', today)
      .eq('status', 'confirmed')
      .order('start_date')
      .then(({ data }) => {
        setBookings(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={headingStyle}>Who's There</h3>
        <span style={{ fontSize: '20px' }}>🏠</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-sand-100)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ height: 14, width: '60%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
                <div style={{ height: 12, width: '40%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          House is empty right now.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bookings.map((b, i) => {
            const colors = avatarColors[i % avatarColors.length]
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: colors.bg, color: colors.fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, flexShrink: 0,
                  fontFamily: 'var(--font-body)',
                }}>
                  {initials(b.guest_name)}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '1px' }}>
                    {b.guest_name}
                    {b.party_size > 1 && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                        +{b.party_size - 1}
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {formatRange(b.start_date, b.end_date)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const headingStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '17px',
  fontWeight: 600,
  color: 'var(--color-navy)',
}
