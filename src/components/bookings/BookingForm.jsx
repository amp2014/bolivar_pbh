import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLayout } from '../../contexts/LayoutContext'
import { createCalendarEvent, updateCalendarEvent } from '../../lib/googleCalendar'

const ROOM_OPTIONS = [
  { id: 'Room 1',      sub: 'Queen bed · pack-n-play fits' },
  { id: 'Room 2',      sub: 'Queen bed · twin bunk beds' },
  { id: 'Room 3',      sub: '2 Queen beds · twin bunk bed' },
  { id: 'Living Room', sub: '2 sleeper couches' },
]

// Rooms are serialized as a prefix in the notes field: "Rooms: Room 1, Room 3\n"
function parseNotesRooms(raw) {
  if (!raw) return { rooms: [], cleanNotes: '' }
  const m = raw.match(/^Rooms: ([^\n]+)\n?/)
  if (!m) return { rooms: [], cleanNotes: raw }
  return { rooms: m[1].split(', ').filter(Boolean), cleanNotes: raw.slice(m[0].length) }
}

export default function BookingForm({ booking = null, onSave, onClose }) {
  const { user, profile, providerToken, signInWithGoogle } = useAuth()
  const { isDesktop } = useLayout()

  const parsedNotes = parseNotesRooms(booking?.notes ?? '')

  // Animation
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 320)
  }

  // Form state — pre-fill when editing
  const [guestName, setGuestName]   = useState(booking?.guest_name ?? profile?.display_name ?? '')
  const [startDate, setStartDate]   = useState(booking?.start_date ?? '')
  const [endDate, setEndDate]       = useState(booking?.end_date ?? '')
  const [partySize, setPartySize]   = useState(booking?.party_size ?? 1)
  const [rooms, setRooms]           = useState(parsedNotes.rooms)
  const [notes, setNotes]           = useState(parsedNotes.cleanNotes)
  const [status, setStatus]         = useState(booking?.status ?? 'confirmed')

  const [overlaps, setOverlaps]     = useState([])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  const endRef = useRef(null)

  // Check overlaps whenever dates change
  useEffect(() => {
    if (!startDate || !endDate || endDate < startDate) { setOverlaps([]); return }

    supabase
      .from('bookings')
      .select('id, guest_name, start_date, end_date')
      .neq('status', 'cancelled')
      .lt('start_date', endDate)
      .gt('end_date', startDate)
      .then(({ data }) => {
        const others = (data ?? []).filter((b) => b.id !== booking?.id)
        setOverlaps(others)
      })
  }, [startDate, endDate, booking?.id])

  async function handleSave() {
    if (!guestName.trim()) { setError('Please enter a name.'); return }
    if (!startDate)        { setError('Please select a start date.'); return }
    if (!endDate)          { setError('Please select an end date.'); return }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return }

    setSaving(true)
    setError(null)

    try {
      const roomPrefix = rooms.length ? `Rooms: ${rooms.join(', ')}\n` : ''
      const fullNotes  = (roomPrefix + notes.trim()).trim() || null

      const payload = {
        guest_name: guestName.trim(),
        start_date: startDate,
        end_date: endDate,
        party_size: partySize,
        notes: fullNotes,
        status,
        booked_by: user.id,
      }

      let saved
      if (booking?.id) {
        const { data, error: err } = await supabase.from('bookings').update(payload).eq('id', booking.id).select().single()
        if (err) throw err
        saved = data
      } else {
        const { data, error: err } = await supabase.from('bookings').insert(payload).select().single()
        if (err) throw err
        saved = data
      }

      // Google Calendar sync (best-effort — booking is saved either way)
      if (providerToken) {
        try {
          const existingEventId = booking?.google_calendar_event_id ?? null
          let newEventId = null

          if (existingEventId) {
            const updated = await updateCalendarEvent(providerToken, existingEventId, saved)
            if (!updated) {
              // Event was deleted directly in Google Calendar — recreate it
              newEventId = await createCalendarEvent(providerToken, saved)
            }
          } else {
            newEventId = await createCalendarEvent(providerToken, saved)
          }

          if (newEventId) {
            const { error: calIdErr } = await supabase
              .from('bookings')
              .update({ google_calendar_event_id: newEventId })
              .eq('id', saved.id)
            if (calIdErr) {
              console.warn('Calendar event created but ID could not be saved to DB:', calIdErr.message)
            } else {
              saved = { ...saved, google_calendar_event_id: newEventId }
            }
          }
        } catch (calErr) {
          console.warn('Calendar sync failed:', calErr.message)
        }
      }

      onSave(saved)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 200,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        ...(isDesktop
          ? { top: '50%', left: '50%', right: 'auto', bottom: 'auto', maxWidth: '560px', width: 'calc(100% - 32px)', borderRadius: '16px', transform: visible ? 'translate(-50%, -50%)' : 'translate(-50%, calc(-50% + 24px))', opacity: visible ? 1 : 0 }
          : { bottom: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', transform: visible ? 'translateY(0)' : 'translateY(100%)' }
        ),
        background: 'white',
        zIndex: 201,
        maxHeight: isDesktop ? '90dvh' : '92dvh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.32s',
      }}>
        {/* Drag handle — mobile only */}
        {!isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-sand-200)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '21px', fontWeight: 700, color: 'var(--color-navy)' }}>
            {booking ? 'Edit Booking' : 'New Booking'}
          </h2>
          <button
            onClick={dismiss}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-sand-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', color: 'var(--color-text-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable form */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px', WebkitOverflowScrolling: 'touch' }}>

          {/* Guest name */}
          <Field label="Who's staying?">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Full name"
              style={inputStyle}
              autoFocus
            />
          </Field>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Check in">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (!endDate || e.target.value > endDate) setEndDate(e.target.value)
                  setTimeout(() => endRef.current?.showPicker?.(), 50)
                }}
                style={inputStyle}
              />
            </Field>
            <Field label="Check out">
              <input
                ref={endRef}
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Party size */}
          <Field label="Party size">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                style={counterBtn}
                aria-label="Decrease"
              >
                −
              </button>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-navy)', minWidth: '28px', textAlign: 'center' }}>
                {partySize}
              </span>
              <button
                onClick={() => setPartySize((p) => Math.min(30, p + 1))}
                style={counterBtn}
                aria-label="Increase"
              >
                +
              </button>
            </div>
          </Field>

          {/* Rooms */}
          <Field label="Rooms to use (optional)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ROOM_OPTIONS.map((r) => {
                const checked = rooms.includes(r.id)
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRooms((prev) => checked ? prev.filter((x) => x !== r.id) : [...prev, r.id])}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', textAlign: 'left', width: '100%',
                      border: `1.5px solid ${checked ? 'var(--color-teal)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      background: checked ? 'var(--color-teal-xlight)' : 'var(--color-sand-50)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '4px', flexShrink: 0,
                      border: `1.5px solid ${checked ? 'var(--color-teal)' : 'var(--color-border)'}`,
                      background: checked ? 'var(--color-teal)' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {checked && <span style={{ color: 'white', fontSize: '12px', lineHeight: 1 }}>✓</span>}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-navy)', marginBottom: '1px', fontFamily: 'var(--font-body)' }}>{r.id}</p>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{r.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Notes */}
          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to note about this stay…"
              rows={2}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            />
          </Field>

          {/* Status toggle */}
          <Field label="Status">
            <div style={{ display: 'flex', gap: '8px' }}>
              {['confirmed', 'tentative'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    flex: 1, height: '40px', borderRadius: 'var(--radius-full)',
                    border: status === s ? 'none' : '1.5px solid var(--color-border)',
                    background: status === s ? (s === 'confirmed' ? 'var(--color-navy)' : '#f5a62322') : 'transparent',
                    color: status === s ? (s === 'confirmed' ? 'white' : '#b8860b') : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {/* Overlap warning */}
          {overlaps.length > 0 && (
            <div style={{
              background: '#fff8e1',
              border: '1px solid #f5d040',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '16px',
            }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#8a6800', marginBottom: '4px' }}>
                ⚠️  Heads up — overlapping dates
              </p>
              {overlaps.map((o) => (
                <p key={o.id} style={{ fontSize: '13px', color: '#8a6800' }}>
                  {o.guest_name} · {o.start_date} – {o.end_date}
                </p>
              ))}
              <p style={{ fontSize: '12px', color: '#b8920080', marginTop: '4px' }}>
                This isn't a blocker — just a heads up.
              </p>
            </div>
          )}

          {/* Calendar sync note */}
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            {providerToken
              ? '📅 Will sync to your Google Calendar on save.'
              : (
                <>
                  📅 Calendar token expired.{' '}
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    style={{
                      color: 'var(--color-teal)', background: 'none', border: 'none',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      fontSize: '12px', fontWeight: 600, padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Re-authorize →
                  </button>
                </>
              )
            }
          </p>

          {/* Error */}
          {error && (
            <p style={{ fontSize: '13px', color: 'var(--color-coral)', marginBottom: '12px' }}>
              {error}
            </p>
          )}
        </div>

        {/* Save button */}
        <div style={{ padding: '12px 20px', paddingBottom: isDesktop ? '20px' : 'calc(12px + var(--safe-bottom))' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600 }}
          >
            {saving ? 'Saving…' : booking ? 'Save Changes' : 'Book Stay'}
          </button>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
        marginBottom: '6px',
        fontFamily: 'var(--font-body)',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  height: '44px',
  padding: '0 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-sand-50)',
  fontFamily: 'var(--font-body)',
  fontSize: '15px',
  color: 'var(--color-text)',
  outline: 'none',
  boxSizing: 'border-box',
}

const counterBtn = {
  width: 40, height: 40,
  borderRadius: '50%',
  border: '1.5px solid var(--color-border)',
  background: 'white',
  fontSize: '20px',
  color: 'var(--color-navy)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  lineHeight: 1,
  fontWeight: 300,
}
