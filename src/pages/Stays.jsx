import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { deleteCalendarEvent } from '../lib/googleCalendar'
import BookingCard from '../components/bookings/BookingCard'
import BookingForm from '../components/bookings/BookingForm'

const TABS = ['upcoming', 'past']

export default function Stays() {
  const { isFamily, providerToken, profile } = useAuth()
  const [tab, setTab]               = useState('upcoming')
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editBooking, setEditBooking] = useState(null)

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

  async function handleDelete(booking) {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_name: profile?.display_name ?? 'Unknown',
      })
      .eq('id', booking.id)
    if (error) { console.error('Cancel failed:', error.message); return }

    if (providerToken && booking.google_calendar_event_id) {
      deleteCalendarEvent(providerToken, booking.google_calendar_event_id).catch((e) => {
        console.warn('Calendar delete failed:', e.message)
      })
    }

    setBookings((prev) => prev.filter((b) => b.id !== booking.id))
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

  return (
    <main className="page" style={{ paddingTop: 0 }}>

      {/* Header */}
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
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative' }}>
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

      <div className="page-inner" style={{ paddingTop: '16px' }}>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--color-sand-100)',
          borderRadius: 'var(--radius-full)',
          padding: '4px',
          marginBottom: '16px',
        }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                height: '36px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? 'var(--color-navy)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: tab === t ? 600 : 400,
                cursor: 'pointer',
                boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
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

      {/* Booking form sheet */}
      {showForm && (
        <BookingForm
          booking={editBooking}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditBooking(null) }}
        />
      )}
    </main>
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
        {tab === 'upcoming'
          ? 'Book the first stay of the season.'
          : 'Past bookings will appear here.'}
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
