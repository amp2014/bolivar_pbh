const CALENDAR_ID = 'c761ed5e7cb0699120271f2d685a73dd12c53afa65c1d6d02fc70537cfa5c34a@group.calendar.google.com'
const BASE = 'https://www.googleapis.com/calendar/v3'

// Google all-day events: end = day AFTER the last day
function gcalEnd(endDate) {
  const d = new Date(endDate + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function eventBody(booking) {
  return {
    summary: `${booking.guest_name} @ Bolivar Beach House`,
    location: '604 Nelson Ave, Bolivar, TX 77650',
    description: booking.notes ?? undefined,
    start: { date: booking.start_date },
    end:   { date: gcalEnd(booking.end_date) },
  }
}

async function gcalFetch(token, path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok && res.status !== 204 && res.status !== 404 && res.status !== 410) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message ?? `Google Calendar error (${res.status})`)
  }
  return res.status === 204 ? null : res.json().catch(() => null)
}

export async function createCalendarEvent(token, booking) {
  const data = await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
    { method: 'POST', body: JSON.stringify(eventBody(booking)) },
  )
  return data?.id ?? null
}

export async function updateCalendarEvent(token, eventId, booking) {
  await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
    { method: 'PATCH', body: JSON.stringify(eventBody(booking)) },
  )
}

export async function deleteCalendarEvent(token, eventId) {
  await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
    { method: 'DELETE', headers: { 'Content-Type': '' } },
  )
}
