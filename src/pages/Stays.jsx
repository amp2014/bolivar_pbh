import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLayout } from '../contexts/LayoutContext'
import { deleteCalendarEvent } from '../lib/googleCalendar'
import BookingCard from '../components/bookings/BookingCard'
import BookingForm from '../components/bookings/BookingForm'

const TABS = ['upcoming', 'past']

function nights(start, end) {
  return Math.round(
    (new Date(end + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000
  )
}

function fmtDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatRange(start, end) {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end   + 'T12:00:00')
  const sm = s.toLocaleDateString('en-US', { month: 'short' })
  const em = e.toLocaleDateString('en-US', { month: 'short' })
  const sy = s.getFullYear()
  const ey = e.getFullYear()
  const cur = new Date().getFullYear()
  const yearSuffix = (y) => (y !== cur ? `, ${y}` : '')
  if (sm === em && sy === ey) return `${sm} ${s.getDate()}–${e.getDate()}${yearSuffix(sy)}`
  return `${sm} ${s.getDate()}${yearSuffix(sy)} – ${em} ${e.getDate()}${yearSuffix(ey)}`
}

export default function Stays() {
  const { isFamily, providerToken, profile } = useAuth()
  const { isDesktop } = useLayout()
  const [tab, setTab]               = useState('upcoming')
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editBooking, setEditBooking] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting]     = useState(false)

  async function fetchBookings() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    let query = supabase
      .from('bookings')
      .select('*')
      .neq('status', 'cancelled')
    if (tab === 'upcoming') {
      query = query.gte('end_date', today).order('start_date', { ascending: true })
    } else {
      query = query.lt('end_date', today).order('start_date', { ascending: false })
    }
    const { data } = await query
    setBookings(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDelete(booking) {
    setPendingDelete(booking)
  }

  async function executeDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_name: profile?.display_name ?? 'Unknown',
      })
      .eq('id', pendingDelete.id)
    if (!error) {
      if (providerToken && pendingDelete.google_calendar_event_id) {
        deleteCalendarEvent(providerToken, pendingDelete.google_calendar_event_id).catch((e) => {
          console.warn('Calendar delete failed:', e.message)
        })
      }
      setBookings((prev) => prev.filter((b) => b.id !== pendingDelete.id))
    } else {
      console.error('Cancel failed:', error.message)
    }
    setDeleting(false)
    setPendingDelete(null)
  }

  function handleEdit(booking) {
    setEditBooking(booking)
    setShowForm(true)
  }

  function handleSaved() {
    setShowForm(false)
    setEditBooking(null)
    fetchBookings()
  }

  const today = new Date().toISOString().split('T')[0]

  const pageHeader = (
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
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', paddingRight: '48px' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontFamily: 'var(--font-body)', marginBottom: '3px' }}>
            Bookings
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}>
            Stays
          </h1>
        </div>
        {isFamily && (
          <button
            onClick={() => { setEditBooking(null); setShowForm(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--color-teal)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-full)',
              padding: '10px 18px', fontSize: '14px', fontWeight: 600,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
            Book
          </button>
        )}
      </div>
    </div>
  )

  const tabBar = (
    <div style={{
      display: 'flex', gap: '4px',
      background: 'var(--color-sand-100)',
      borderRadius: 'var(--radius-full)',
      padding: '4px', marginBottom: '16px',
    }}>
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          style={{
            flex: 1, height: '36px',
            borderRadius: 'var(--radius-full)', border: 'none',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--color-navy)' : 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)', fontSize: '14px',
            fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
            boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
            transition: 'all 0.15s', textTransform: 'capitalize',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )

  // ── Desktop layout ──────────────────────────────────────────
  if (isDesktop) {
    return (
      <main className="page" style={{ paddingTop: 0 }}>
        {pageHeader}
        <div style={{ padding: '24px', maxWidth: '780px', margin: '0 auto' }}>
          {tabBar}

          {loading ? (
            <SkeletonList />
          ) : bookings.length === 0 ? (
            <EmptyState tab={tab} onAdd={isFamily ? () => { setEditBooking(null); setShowForm(true) } : null} />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Guest', 'Check-in', 'Check-out', 'Nights', 'Notes', ''].map((h) => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontSize: '10px', fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                        letterSpacing: '1px', textTransform: 'uppercase',
                        fontWeight: 600, background: 'var(--color-sand-50)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => {
                    const isActive = b.start_date <= today && b.end_date >= today
                    return (
                      <tr
                        key={b.id}
                        style={{
                          borderBottom: i < bookings.length - 1 ? '1px solid var(--color-border)' : 'none',
                          background: isActive ? 'var(--color-teal-xlight)' : 'white',
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-navy)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                              {b.guest_name}
                            </span>
                            {isActive && (
                              <span style={{
                                fontSize: '10px', fontWeight: 700,
                                color: 'var(--color-teal)', fontFamily: 'var(--font-mono)',
                                background: 'white', borderRadius: '4px',
                                padding: '2px 6px', letterSpacing: '0.5px',
                              }}>
                                HERE NOW
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '3px', color: b.google_calendar_event_id ? 'var(--color-teal)' : 'var(--color-sand-400)' }}>
                            {b.google_calendar_event_id ? '📅 Synced' : '📅 Not synced'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
                          {fmtDate(b.start_date)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
                          {fmtDate(b.end_date)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {nights(b.start_date, b.end_date)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', maxWidth: '200px' }}>
                          {b.notes ?? '—'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isFamily && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleEdit(b)}
                                style={{
                                  fontSize: '12px', fontWeight: 600, color: 'var(--color-teal)',
                                  background: 'none', border: '1px solid var(--color-teal)',
                                  borderRadius: 'var(--radius-sm)', padding: '5px 12px',
                                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(b)}
                                style={{
                                  fontSize: '12px', fontWeight: 600, color: 'var(--color-coral)',
                                  background: 'none', border: '1px solid var(--color-coral)',
                                  borderRadius: 'var(--radius-sm)', padding: '5px 12px',
                                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <BookingForm
            booking={editBooking}
            onSave={handleSaved}
            onClose={() => { setShowForm(false); setEditBooking(null) }}
          />
        )}
        {pendingDelete && (
          <ConfirmCancelModal
            booking={pendingDelete}
            deleting={deleting}
            isDesktop={isDesktop}
            onConfirm={executeDelete}
            onClose={() => !deleting && setPendingDelete(null)}
          />
        )}
      </main>
    )
  }

  // ── Mobile layout ───────────────────────────────────────────
  return (
    <main className="page" style={{ paddingTop: 0 }}>
      {pageHeader}
      <div className="page-inner" style={{ paddingTop: '16px' }}>
        {tabBar}
        {loading ? (
          <SkeletonList />
        ) : bookings.length === 0 ? (
          <EmptyState tab={tab} onAdd={isFamily ? () => { setEditBooking(null); setShowForm(true) } : null} />
        ) : (
          bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              today={today}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {showForm && (
        <BookingForm
          booking={editBooking}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditBooking(null) }}
        />
      )}
      {pendingDelete && (
        <ConfirmCancelModal
          booking={pendingDelete}
          deleting={deleting}
          isDesktop={isDesktop}
          onConfirm={executeDelete}
          onClose={() => !deleting && setPendingDelete(null)}
        />
      )}
    </main>
  )
}

function ConfirmCancelModal({ booking, deleting, isDesktop, onConfirm, onClose }) {
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
          Cancel this stay?
        </h3>
        <p style={{
          fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5,
          marginBottom: '20px',
        }}>
          This will remove <strong style={{ color: 'var(--color-text)' }}>{booking.guest_name}</strong>'s stay
          from {formatRange(booking.start_date, booking.end_date)} from the calendar. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              flex: 1, height: '44px', borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--color-border)',
              background: 'white', color: 'var(--color-text)',
              fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: 'pointer', opacity: deleting ? 0.6 : 1,
            }}
          >
            Keep Stay
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1, height: '44px', borderRadius: 'var(--radius-full)',
              border: 'none', background: '#D4634A', color: 'white',
              fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: deleting ? 'default' : 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Cancelling…' : 'Yes, Cancel It'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ tab, onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌊</div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-navy)', marginBottom: '8px' }}>
        {tab === 'upcoming' ? 'No upcoming stays' : 'No past stays'}
      </p>
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        {tab === 'upcoming' ? 'Book the first stay of the season.' : 'Past bookings will appear here.'}
      </p>
      {onAdd && (
        <button onClick={onAdd} className="btn btn-teal">
          + Book a Stay
        </button>
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ opacity: 1 - i * 0.2 }}>
          <div style={{ height: 20, width: '55%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 14, width: '40%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 12, width: '30%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
