// NOAA CO-OPS API service — tide predictions + water temperature
// Free, no API key required.
//
// Station constants — swap these if a closer station becomes available:
//   TIDE_STATION:       8771450 = Galveston Pier 21
//                       ~3.7 miles from 604 Nelson Ave, Bolivar TX.
//                       Primary reference station for Galveston Bay mouth.
//                       Provides: tide predictions, water level, water temp.
//   WATER_TEMP_STATION: Same station (8771450 has thermometer sensors).
//                       Change to a different ID if a closer sensor is found.
const TIDE_STATION      = '8771450'
const WATER_TEMP_STATION = '8771450'

const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'

const MODULE_CACHE = {}

function cacheKey(key) { return key }
function getCached(key) {
  const entry = MODULE_CACHE[key]
  if (!entry) return null
  // expire after 30 minutes
  if (Date.now() - entry.ts > 30 * 60 * 1000) return null
  return entry.data
}
function setCache(key, data) {
  MODULE_CACHE[key] = { ts: Date.now(), data }
}

// ── getTidePredictions ────────────────────────────────────────────────────────
// Returns high/low predictions for today + `days` days ahead.
// Shape: [{ datetime: Date, type: 'H'|'L', height_ft: number }]
export async function getTidePredictions({ days = 7 } = {}) {
  const key = cacheKey(`tides_${days}`)
  const cached = getCached(key)
  if (cached) return { ok: true, data: cached }

  try {
    const today = new Date()
    const begin = formatDate(today)
    const end   = formatDate(addDays(today, days))

    const url = `${BASE}?` + new URLSearchParams({
      product:   'predictions',
      datum:     'MLLW',
      interval:  'hilo',
      units:     'english',
      time_zone: 'lst_ldt',
      format:    'json',
      station:   TIDE_STATION,
      begin_date: begin,
      end_date:   end,
    })

    const res  = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.error) throw new Error(json.error.message)

    const data = (json.predictions ?? []).map(p => ({
      datetime:  new Date(p.t),
      type:      p.type,           // 'H' or 'L'
      height_ft: parseFloat(p.v),
    }))

    setCache(key, data)
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err.message, data: [] }
  }
}

// ── getCurrentTideState ───────────────────────────────────────────────────────
// Derives current tide state from the nearest prediction window.
// Returns: { state: 'rising'|'falling'|'high'|'low', height_ft, next: {type, datetime} }
export async function getCurrentTideState() {
  const { ok, data, error } = await getTidePredictions({ days: 2 })
  if (!ok || data.length < 2) return { ok: false, error: error ?? 'no data' }

  try {
    const now = new Date()

    // Find the most recent event before now and the next event after now
    let prev = null
    let next = null
    for (let i = 0; i < data.length; i++) {
      if (data[i].datetime <= now) {
        prev = data[i]
      } else {
        next = data[i]
        break
      }
    }

    if (!next) return { ok: false, error: 'no future predictions' }

    // If the last event was within 30 min, label as high/low
    let state
    const msSincePrev = prev ? now - prev.datetime : Infinity
    if (msSincePrev < 30 * 60 * 1000 && prev) {
      state = prev.type === 'H' ? 'high' : 'low'
    } else if (next.type === 'H') {
      state = 'rising'
    } else {
      state = 'falling'
    }

    // Interpolate approximate current height
    let height_ft = prev?.height_ft ?? next.height_ft
    if (prev && next) {
      const span  = next.datetime - prev.datetime
      const elapsed = now - prev.datetime
      const frac  = Math.min(1, Math.max(0, elapsed / span))
      height_ft = prev.height_ft + frac * (next.height_ft - prev.height_ft)
    }

    return {
      ok: true,
      state,
      height_ft: +height_ft.toFixed(2),
      next: { type: next.type, datetime: next.datetime },
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── getWaterTemp ──────────────────────────────────────────────────────────────
// Returns latest water temperature in °F, or null if unavailable.
export async function getWaterTemp() {
  const key = cacheKey('water_temp')
  const cached = getCached(key)
  if (cached !== null) return { ok: true, temp_f: cached }

  try {
    const url = `${BASE}?` + new URLSearchParams({
      product:   'water_temperature',
      datum:     'MLLW',
      units:     'english',
      time_zone: 'lst_ldt',
      format:    'json',
      station:   WATER_TEMP_STATION,
      date:      'latest',
    })

    const res  = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.error) return { ok: true, temp_f: null } // no sensor data — clean null

    const latest = json.data?.[0]
    const temp   = latest ? parseFloat(latest.v) : null
    if (temp === null || isNaN(temp)) return { ok: true, temp_f: null }

    setCache(key, temp)
    return { ok: true, temp_f: temp }
  } catch (err) {
    return { ok: false, error: err.message, temp_f: null }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

function addDays(d, n) {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}
