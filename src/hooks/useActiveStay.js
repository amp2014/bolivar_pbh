import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUpcomingStaysForUser } from '../services/stayOccupants'

/**
 * Returns the user's stay context based on stays they are ON (booker or tagged).
 *
 *   state:    'loading' | 'active' | 'upcoming' | 'none'
 *   stay:     the relevant booking object (null when 'none')
 *   daysUntil: 0 when active, N when upcoming, null when none
 */
export function useActiveStay() {
  const { user } = useAuth()
  const [state, setState] = useState('loading')
  const [stay, setStay] = useState(null)
  const [daysUntil, setDaysUntil] = useState(null)

  useEffect(() => {
    if (!user) {
      setState('none')
      setStay(null)
      setDaysUntil(null)
      return
    }

    // Check a 7-day window so we can identify active vs upcoming
    getUpcomingStaysForUser(user.id, 7).then((stays) => {
      if (stays.length === 0) {
        setState('none')
        setStay(null)
        setDaysUntil(null)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const active = stays.find(
        (s) => s.start_date <= today && s.end_date >= today
      )

      if (active) {
        setState('active')
        setStay(active)
        setDaysUntil(0)
        return
      }

      // Stays are sorted by start_date asc; first one is the nearest upcoming
      const upcoming = stays[0]
      const ms = new Date(upcoming.start_date + 'T12:00:00') - new Date()
      const days = Math.ceil(ms / 86400000)
      setState('upcoming')
      setStay(upcoming)
      setDaysUntil(days)
    })
  }, [user?.id])

  return { state, stay, daysUntil }
}
