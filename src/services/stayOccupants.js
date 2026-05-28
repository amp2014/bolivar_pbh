import { supabase } from '../lib/supabase'

/**
 * Returns everyone on a stay: booker first, then tagged occupants.
 * Emails are resolved from the users table (not entered manually).
 */
export async function getStayPeople(stayId) {
  if (!stayId) return []

  const [{ data: booking }, { data: occupants }] = await Promise.all([
    supabase
      .from('bookings')
      .select('booked_by, booked_by_name')
      .eq('id', stayId)
      .single(),
    supabase
      .from('stay_occupants')
      .select('user_id, users(id, display_name, email)')
      .eq('stay_id', stayId),
  ])

  if (!booking) return []

  const people = []

  // Resolve booker from users table
  const { data: bookerUser } = await supabase
    .from('users')
    .select('id, display_name, email')
    .eq('id', booking.booked_by)
    .single()

  if (bookerUser) {
    people.push({
      user_id: bookerUser.id,
      name: bookerUser.display_name ?? booking.booked_by_name ?? 'Unknown',
      email: bookerUser.email,
      role: 'booker',
    })
  }

  for (const occ of (occupants ?? [])) {
    if (occ.users) {
      people.push({
        user_id: occ.user_id,
        name: occ.users.display_name ?? 'Unknown',
        email: occ.users.email,
        role: 'occupant',
      })
    }
  }

  return people
}

/**
 * True if userId is the booker OR a tagged occupant of the stay.
 * Requires stay.booked_by; optionally uses stay.occupant_ids (array of user UUIDs)
 * pre-populated by getUpcomingStaysForUser to avoid extra queries.
 */
export function isUserOnStay(userId, stay) {
  if (!userId || !stay) return false
  if (stay.booked_by === userId) return true
  return Array.isArray(stay.occupant_ids) && stay.occupant_ids.includes(userId)
}

/**
 * Returns all non-cancelled stays the user is ON (booker or tagged) that
 * overlap the window [today … today+withinDays], sorted by start_date asc.
 * Each stay is augmented with an occupant_ids array for isUserOnStay().
 */
export async function getUpcomingStaysForUser(userId, withinDays = 7) {
  if (!userId) return []

  const today = new Date().toISOString().split('T')[0]
  const cutoff = new Date(Date.now() + withinDays * 86400000).toISOString().split('T')[0]

  // Fetch stays where user is the booker
  const [{ data: bookedStays }, { data: taggedOccupancies }] = await Promise.all([
    supabase
      .from('bookings')
      .select('*')
      .eq('booked_by', userId)
      .neq('status', 'cancelled')
      .lte('start_date', cutoff)
      .gte('end_date', today),
    supabase
      .from('stay_occupants')
      .select('stay_id')
      .eq('user_id', userId),
  ])

  const taggedIds = (taggedOccupancies ?? []).map((o) => o.stay_id)

  let taggedStays = []
  if (taggedIds.length > 0) {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .in('id', taggedIds)
      .neq('status', 'cancelled')
      .lte('start_date', cutoff)
      .gte('end_date', today)
    taggedStays = data ?? []
  }

  // Merge and deduplicate
  const stayMap = new Map()
  for (const s of [...(bookedStays ?? []), ...taggedStays]) {
    if (!stayMap.has(s.id)) stayMap.set(s.id, s)
  }
  const merged = [...stayMap.values()].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  )

  if (merged.length === 0) return []

  // Augment with occupant_ids so callers can use isUserOnStay() synchronously
  const stayIds = merged.map((s) => s.id)
  const { data: allOccupants } = await supabase
    .from('stay_occupants')
    .select('stay_id, user_id')
    .in('stay_id', stayIds)

  const occupantMap = {}
  for (const occ of (allOccupants ?? [])) {
    occupantMap[occ.stay_id] = occupantMap[occ.stay_id] ?? []
    occupantMap[occ.stay_id].push(occ.user_id)
  }

  return merged.map((s) => ({ ...s, occupant_ids: occupantMap[s.id] ?? [] }))
}
