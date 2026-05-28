import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLayout } from '../../contexts/LayoutContext'

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
  const { isAdmin } = useAuth()
  const { isDesktop } = useLayout()
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('All')
  const [search, setSearch]         = useState('')
  const [pendingPurge, setPendingPurge] = useState(null)  // booking | null
  const [showPurgeAll, setShowPurgeAll] = useState(false)
  const [purging, setPurging]       = useState(false)

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

  async function handlePurgeSingle() {
    if (!pendingPurge || !isAdmin) return
    setPurging(true)
    const { error } = await supabase.from('bookings').delete().eq('id', pendingPurge.id)
    if (!error) {
      setBookings((prev) => prev.filter((b) => b.id !== pendingPurge.id))
    }
    setPurging(false)
    setPendingPurge(null)
  }

  async function handlePurgeAll() {
    if (!isAdmin) return
    setPurging(true)
    const { error } = await supabase.from('bookings').delete().eq('status', 'cancelled')
    if (!error) {
      setBookings((prev) => prev.filter((b) => b.status !== 'cancelled'))
    }
    setPurging(false)
    setShowPurgeAll(false)
  }

  const displayed = bookings.filter((b) => {
    const matchFilter = filter === 'All' || b.status === filter.toLowerCase()
    const matchSearch = !search || b.guest_name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {})

  const cancelledCount = counts.cancelled ?? 0

  return (
    <>
      <style>{`
        .pbh-log-trash-btn { opacity: 1; transition: opacity 0.15s; }
        @media (hover: hover) {
          .pbh-log-trash-btn { opacity: 0; }
          .pbh-log-row:hover .pbh-log-trash-btn { opacity: 1; }
        }
      `}</style>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',     count: bookings.length,          color: 'var(--color-navy)' },
          { label: 'Confirmed', count: counts.confirmed ?? 0,    color: 'var(--color-teal)' },
          { label: 'Tentative', count: counts.tentative ?? 0,    color: '#b8860b' },
          { label: 'Cancelled', count: cancelledCount,           color: 'var(--color-text-muted)' },
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

      {/* Purge All Cancelled — admin only */}
      {isAdmin && cancelledCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button
            onClick={() => setShowPurgeAll(true)}
            style={{
              fontSize: '12px', fontWeight: 600,
              color: 'var(--color-coral)',
              background: 'rgba(212,99,74,0.08)',
              border: '1px solid rgba(212,99,74,0.3)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Purge All Cancelled ({cancelledCount})
          </button>
        </div>
      )}

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
                className="card pbh-log-row"
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
                  {/* Name + badge + trash */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <p style={{
                      fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600,
                      color: 'var(--color-navy)', lineHeight: 1.2,
                      textDecoration: isCancelled ? 'line-through' : 'none',
                    }}>
                      {b.guest_name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px',
                        textTransform: 'uppercase', padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: meta.bg, color: meta.color,
                      }}>
                        {meta.label}
                      </span>
                      {isAdmin && (
                        <button
                          className="pbh-log-trash-btn"
                          onClick={() => setPendingPurge(b)}
                          aria-label="Delete log entry"
                          style={{
                            background: 'none', border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer', padding: '4px',
                            borderRadius: '4px', lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dates + nights */}
                  <p style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: 500, marginBottom: '4px' }}>
                    {formatRange(b.start_date, b.end_date)}
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                      {n} {n === 1 ? 'night' : 'nights'}
                    </span>
                  </p>

                  {/* Party size + notes */}
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
                    {b.google_calendar_event_id ? ' · 📅 Synced' : ' · 📅 Not synced'}
                  </p>

                  {/* Cancellation info */}
                  {isCancelled && (b.cancelled_at || b.cancelled_by_name) && (
                    <p style={{ fontSize: '11px', color: 'var(--color-coral)', marginTop: '4px', fontWeight: 500 }}>
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

      {/* Single-entry delete confirm */}
      {pendingPurge && (
        <ConfirmModal
          isDesktop={isDesktop}
          title="Permanently delete this entry?"
          body={`This removes ${pendingPurge.guest_name}'s booking from the admin log only. The Google Calendar event is not affected.`}
          confirmLabel={purging ? 'Deleting…' : 'Delete Entry'}
          cancelLabel="Cancel"
          purging={purging}
          onConfirm={handlePurgeSingle}
          onClose={() => !purging && setPendingPurge(null)}
        />
      )}

      {/* Purge all cancelled confirm */}
      {showPurgeAll && (
        <ConfirmModal
          isDesktop={isDesktop}
          title="Delete all cancelled bookings?"
          body={`Delete all ${cancelledCount} cancelled booking${cancelledCount !== 1 ? 's' : ''} from the log? This cannot be undone.`}
          confirmLabel={purging ? 'Deleting…' : 'Delete All'}
          cancelLabel="Cancel"
          purging={purging}
          onConfirm={handlePurgeAll}
          onClose={() => !purging && setShowPurgeAll(false)}
        />
      )}
    </>
  )
}

function ConfirmModal({ isDesktop, title, body, confirmLabel, cancelLabel, purging, onConfirm, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 350,
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: isDesktop ? '16px' : '20px 20px 0 0',
          width: '100%',
          maxWidth: isDesktop ? '400px' : '100%',
          padding: '24px 20px',
          paddingBottom: isDesktop ? '24px' : 'calc(24px + var(--safe-bottom, 0px))',
        }}
      >
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700,
          color: 'var(--color-navy)', marginBottom: '10px',
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5,
          marginBottom: '20px',
        }}>
          {body}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={purging}
            style={{
              flex: 1, height: '44px', borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--color-border)',
              background: 'white', color: 'var(--color-text)',
              fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: 'pointer', opacity: purging ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={purging}
            style={{
              flex: 1, height: '44px', borderRadius: 'var(--radius-full)',
              border: 'none', background: '#D4634A', color: 'white',
              fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: purging ? 'default' : 'pointer',
              opacity: purging ? 0.7 : 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
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
