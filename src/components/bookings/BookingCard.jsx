import { useAuth } from '../../contexts/AuthContext'
import OccupantsSection from './OccupantsSection'

function formatRange(start, end) {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const sm = s.toLocaleDateString('en-US', { month: 'short' })
  const em = e.toLocaleDateString('en-US', { month: 'short' })
  const sy = s.getFullYear()
  const ey = e.getFullYear()
  const cur = new Date().getFullYear()
  const yearSuffix = (y) => (y !== cur ? `, ${y}` : '')
  if (sm === em && sy === ey) return `${sm} ${s.getDate()}–${e.getDate()}${yearSuffix(sy)}`
  return `${sm} ${s.getDate()}${yearSuffix(sy)} – ${em} ${e.getDate()}${yearSuffix(ey)}`
}

function nights(start, end) {
  return Math.round((new Date(end + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000)
}

export default function BookingCard({ booking, onEdit, onDelete }) {
  const { isFamily } = useAuth()

  const isTentative = booking.status === 'tentative'
  const n = nights(booking.start_date, booking.end_date)

  return (
    <div className="card" style={{ marginBottom: '10px', position: 'relative', overflow: 'hidden' }}>
      {/* Status stripe */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: '4px',
        background: isTentative ? 'var(--color-sun)' : 'var(--color-teal)',
        borderRadius: '14px 0 0 14px',
      }} />

      <div style={{ paddingLeft: '8px' }}>
        {/* Top row: name + status badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--color-navy)',
            lineHeight: 1.2,
          }}>
            {booking.guest_name}
          </h3>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            background: isTentative ? '#fff8e1' : 'var(--color-teal-xlight)',
            color: isTentative ? '#b8860b' : 'var(--color-teal)',
            flexShrink: 0,
            marginLeft: '8px',
          }}>
            {booking.status}
          </span>
        </div>

        {/* Date + nights */}
        <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '4px', fontWeight: 500 }}>
          {formatRange(booking.start_date, booking.end_date)}
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
            {n} {n === 1 ? 'night' : 'nights'}
          </span>
        </p>

        {/* Party size + notes */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {booking.party_size > 1 && (
            <span style={metaStyle}>
              👥 {booking.party_size} guests
            </span>
          )}
          {booking.notes && (
            <span style={{ ...metaStyle, fontStyle: 'italic' }}>
              {booking.notes.length > 60 ? booking.notes.slice(0, 60) + '…' : booking.notes}
            </span>
          )}
        </div>

        {/* Calendar sync indicator */}
        <p style={{ fontSize: '11px', color: booking.google_calendar_event_id ? 'var(--color-teal)' : 'var(--color-sand-400)', marginTop: '6px' }}>
          {booking.google_calendar_event_id ? '📅 Synced to Google Calendar' : '📅 Not synced'}
        </p>

        {/* Actions (family/admin only) */}
        {isFamily && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => onEdit(booking)} style={actionBtn}>
                Edit
              </button>
              <button onClick={() => onDelete(booking)} style={{ ...actionBtn, color: 'var(--color-coral)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Who's Staying — visible to family/admin; edit controls gated to booker/admin inside */}
        {isFamily && <OccupantsSection booking={booking} />}
      </div>
    </div>
  )
}

const metaStyle = {
  fontSize: '12px',
  color: 'var(--color-text-muted)',
}

const actionBtn = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-navy)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 0',
  minHeight: '32px',
}
