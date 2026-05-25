import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const STATUS_META = {
  confirmed:  { label: 'Confirmed',  color: 'var(--color-teal)',  bg: 'var(--color-teal-xlight)' },
  tentative:  { label: 'Tentative',  color: '#b8860b',            bg: '#fff8e1' },
  cancelled:  { label: 'Cancelled',  color: 'var(--color-text-muted)', bg: 'var(--color-sand-100)' },
}

function formatRange(start, end) {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end   + 'T12:00:00')
  const sm = s.toLocaleDateString('en-US', { month: 'short' })
  const em = e.toLocaleDateString('en-US', { month: 'short' })
  const sy = s.getFullYear(), ey = e.getFullYear(), cur = new Date().getFullYear()
  const yr = (y) => y !== cur ? `, ${y}` : ''
  if (sm === em && sy === ey) return `${sm} ${s.getDate()}–${e.getDate()}${yr(sy)}`
  return `${sm} ${s.getDate()}${yr(sy)} – ${em} ${e.getDate()}${yr(ey)}`
}

function nights(start, end) {
  return Math.round((new Date(end + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000)
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const FILTERS = ['All', 'Confirmed', 'Tentative', 'Cancelled']

export default function BookingLog() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .order('start_date', { ascending: false })
      setBookings(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const displayed = bookings.filter((b) => {
    const matchFilter = filter === 'All' || b.status === filter.toLowerCase()
    const matchSearch = !search || b.guest_name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* Summary chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',     count: bookings.length,          color: 'var(--color-navy)' },
          { label: 'Confirmed', count: counts.confirmed ?? 0,    color: 'var(--color-teal)' },
          { label: 'Tentative', count: counts.tentative ?? 0,    color: '#b8860b' },
          { label: 'Cancelled', count: counts.cancelled ?? 0,    color: 'var(--color-text-muted)' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'white', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', padding: '8px 14px', minWidth: '60px',
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{count}</span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name…"
        style={{
          width: '100%', height: '40px', padding: '0 14px',
          borderRadius: 'var(--radius-full)',
          border: '1.5px solid var(--color-border)',
          background: 'white', fontFamily: 'var(--font-body)',
          fontSize: '14px', color: 'var(--color-text)', outline: 'none',
          boxSizing: 'border-box', marginBottom: '10px',
        }}
      />

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              height: '30px', padding: '0 14px',
              borderRadius: 'var(--radius-full)',
              border: filter === f ? 'none' : '1px solid var(--color-border)',
              background: filter === f ? 'var(--color-navy)' : 'white',
              color: filter === f ? 'white' : 'var(--color-text-muted)',
              fontSize: '12px', fontWeight: filter === f ? 600 : 400,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <SkeletonList />
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          No bookings found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayed.map((b) => {
            const meta = STATUS_META[b.status] ?? STATUS_META.confirmed
            const n = nights(b.start_date, b.end_date)
            const isCancelled = b.status === 'cancelled'
            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: '12px 14px',
                  opacity: isCancelled ? 0.7 : 1,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Left stripe */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                  background: meta.color, borderRadius: '14px 0 0 14px',
                  opacity: isCancelled ? 0.4 : 1,
                }} />
                <div style={{ paddingLeft: '8px' }}>
                  {/* Name + badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <p style={{
                      fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600,
                      color: 'var(--color-navy)', lineHeight: 1.2,
                      textDecoration: isCancelled ? 'line-through' : 'none',
                    }}>
                      {b.guest_name}
                    </p>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px',
                      textTransform: 'uppercase', padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: meta.bg, color: meta.color,
                      flexShrink: 0,
                    }}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Dates + nights */}
                  <p style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: 500, marginBottom: '4px' }}>
                    {formatRange(b.start_date, b.end_date)}
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                      {n} {n === 1 ? 'night' : 'nights'}
                    </span>
                  </p>

                  {/* Party size + calendar */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                    {b.party_size > 1 && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>👥 {b.party_size} guests</span>
                    )}
                    {b.notes && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        {b.notes.length > 50 ? b.notes.slice(0, 50) + '…' : b.notes}
                      </span>
                    )}
                  </div>

                  {/* Booked on */}
                  <p style={{ fontSize: '11px', color: 'var(--color-sand-400)' }}>
                    Booked {shortDate(b.created_at)}
                    {b.google_calendar_event_id
                      ? ' · 📅 Synced'
                      : ' · 📅 Not synced'}
                  </p>

                  {/* Cancellation info */}
                  {isCancelled && (b.cancelled_at || b.cancelled_by_name) && (
                    <p style={{
                      fontSize: '11px', color: 'var(--color-coral)',
                      marginTop: '4px', fontWeight: 500,
                    }}>
                      Cancelled{b.cancelled_by_name ? ` by ${b.cancelled_by_name}` : ''}
                      {b.cancelled_at ? ` on ${shortDate(b.cancelled_at)}` : ''}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card" style={{ padding: '12px 14px', opacity: 1 - i * 0.15 }}>
          <div style={{ height: 16, width: '50%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 13, width: '65%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 11, width: '35%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
