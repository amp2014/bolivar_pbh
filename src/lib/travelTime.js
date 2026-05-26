const CACHE_PREFIX = 'pbh_travel_'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

const GALV_FERRY  = { lat: 29.3458, lng: -94.7834 } // Galveston Ferry Landing
const BOLIVAR_DEST = { lat: 29.5072, lng: -94.5756 } // Bolivar Peninsula
const FERRY_OVERHEAD_MIN = 27 // ~9 min loading + ~18 min crossing

export async function getTravelTimes(homeAddress) {
  if (!homeAddress?.trim()) return null

  const addr = homeAddress.trim()
  const cacheKey = CACHE_PREFIX + addr.toLowerCase()

  try {
    const raw = localStorage.getItem(cacheKey)
    if (raw) {
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts < CACHE_TTL) return data
    }
  } catch (_) {}

  const coords = await geocodeAddress(addr)
  if (!coords) return null

  const [ferryDrive, backWay] = await Promise.all([
    getRouteDuration(coords, GALV_FERRY),
    getRouteDuration(coords, BOLIVAR_DEST),
  ])

  if (ferryDrive == null && backWay == null) return null

  const result = {
    ferryDriveMins: ferryDrive,
    ferryTotalMins: ferryDrive != null ? ferryDrive + FERRY_OVERHEAD_MIN : null,
    backWayMins: backWay,
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data: result, ts: Date.now() }))
  } catch (_) {}

  return result
}

async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch (_) {
    return null
  }
}

async function getRouteDuration(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    return Math.round(data.routes[0].duration / 60)
  } catch (_) {
    return null
  }
}

export function formatMins(mins) {
  if (mins == null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}
