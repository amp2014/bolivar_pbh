const CALENDAR_ID = 'c761ed5e7cb0699120271f2d685a73dd12c53afa65c1d6d02fc70537cfa5c34a@group.calendar.google.com'
const BASE = 'https://www.googleapis.com/calendar/v3'

// Google all-day events: end date is exclusive (day after the last night)
function gcalEnd(endDate) {
  const d = new Date(endDate + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function fmtTs(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// isEdit = false for new bookings, true for updates
function eventBody(booking, isEdit = false) {
  const guestCount = booking.party_size ?? 1
  const statusLabel = booking.status === 'tentative' ? 'Tentative' : 'Confirmed'

  // Title: [Name], [N] guests, [Confirmed/Tentative]
  const summary = `${booking.guest_name}, ${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}, ${statusLabel}`

  // Parse rooms prefix from notes field: "Rooms: Room 1, Room 3\nfree-text"
  const roomsMatch = booking.notes?.match(/^Rooms: ([^\n]+)\n?/)
  const rooms = roomsMatch ? roomsMatch[1] : null
  const cleanNotes = roomsMatch
    ? booking.notes.slice(roomsMatch[0].length).trim()
    : (booking.notes?.trim() ?? null)

  const lines = []
  if (rooms) lines.push(`Rooms: ${rooms}`)
  lines.push(`Guests: ${guestCount}`)
  if (booking.booked_by_name) lines.push(`Booked by: ${booking.booked_by_name}`)
  const bookedTs = fmtTs(booking.created_at)
  if (bookedTs) lines.push(`Booked: ${bookedTs}`)
  if (isEdit) {
    const editedTs = fmtTs(new Date().toISOString())
    if (editedTs) lines.push(`Last edited: ${editedTs}`)
    lines.push('\nEdited via the Beach House App')
  } else {
    lines.push('\nBooked via the Beach House App')
  }
  if (cleanNotes) lines.push(`Notes: ${cleanNotes}`)

  return {
    summary,
    location: '604 Nelson Ave, Bolivar, TX 77650',
    description: lines.join('\n'),
    // Sets the visual style in Google Calendar (confirmed = solid, tentative = striped)
    status: booking.status === 'tentative' ? 'tentative' : 'confirmed',
    start: { date: booking.start_date },
    end:   { date: gcalEnd(booking.end_date) },
  }
}

async function gcalFetch(token, path, options = {}) {
  const hasBody = options.body != null
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  // Event gone — treat as success, return null so callers can react
  if (res.status === 404 || res.status === 410) return null
  // Successful delete or other no-body response
  if (res.status === 204) return null
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message ?? `Google Calendar error (${res.status})`)
  }
  return res.json().catch(() => null)
}

export async function createCalendarEvent(token, booking) {
  const data = await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
    { method: 'POST', body: JSON.stringify(eventBody(booking, false)) },
  )
  return data?.id ?? null
}

// Returns the updated event data, or null if the event no longer exists (404/410).
// Callers should recreate the event when null is returned.
export async function updateCalendarEvent(token, eventId, booking) {
  return gcalFetch(
    token,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
    { method: 'PATCH', body: JSON.stringify(eventBody(booking, true)) },
  )
}

export async function deleteCalendarEvent(token, eventId) {
  await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
    { method: 'DELETE' },
  )
}
