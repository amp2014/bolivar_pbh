// "Best Time to Fish" composite scorer.
// Weights are named constants — tune here without touching component code.
import SunCalc from 'suncalc'
import { getTidePredictions } from './noaa'
import { getSolunarDay } from './solunar'

const LAT = 29.4583
const LNG = -94.6369

// Scoring weights (must sum to 1.0)
const W_TIDE    = 0.40
const W_DAWN    = 0.25
const W_SOLUNAR = 0.20
const W_WIND    = 0.15

const SAMPLE_STEP_MS = 30 * 60 * 1000  // 30-min slots
const WINDOW_THRESHOLD = 42             // minimum score (0-100) to open a window

// ── Individual scorers (each returns 0..1) ───────────────────────────────────

function tideFlowScore(t, predictions) {
  let prev = null, next = null
  for (const p of predictions) {
    if (p.datetime <= t) prev = p
    else { next = p; break }
  }
  if (!prev || !next) return 0.3
  const span    = next.datetime - prev.datetime
  const elapsed = t - prev.datetime
  const frac    = elapsed / span
  // Cosine tide model: flow rate ∝ sin(π·frac), peaks at midpoint between H/L
  return Math.sin(Math.PI * frac)
}

function dawnDuskScore(t, sunTimes) {
  const dawn    = sunTimes.dawn    || sunTimes.sunrise
  const dusk    = sunTimes.dusk    || sunTimes.sunset
  const HR      = 60 * 60 * 1000
  const dawnGap = Math.abs(t - dawn)
  const duskGap = Math.abs(t - dusk)
  const closest = Math.min(dawnGap, duskGap)
  if (closest < HR)         return 1.0
  if (closest < 2 * HR)     return 0.70
  if (closest < 3 * HR)     return 0.40
  return 0.10
}

function solunarScore(t, solunar) {
  for (const p of solunar.majorPeriods) {
    if (t >= p.start && t <= p.end) {
      const bonus = solunar.dayRating >= 3 ? 0.15 : 0
      return Math.min(1, 1.0 + bonus)
    }
  }
  for (const p of solunar.minorPeriods) {
    if (t >= p.start && t <= p.end) return 0.5
  }
  return 0
}

function windScore(windMph) {
  if (windMph == null) return 0.6
  if (windMph <= 5)   return 1.0
  if (windMph <= 10)  return 0.80
  if (windMph <= 15)  return 0.55
  if (windMph <= 20)  return 0.30
  return 0.10
}

// ── Reason generator ─────────────────────────────────────────────────────────
function generateReason(sample, sunTimes) {
  const { breakdown: b, time } = sample
  const parts = []
  if (b.tide > 0.65)    parts.push('Moving tide')
  const dawn = sunTimes.dawn || sunTimes.sunrise
  const dusk = sunTimes.dusk || sunTimes.sunset
  const HR   = 60 * 60 * 1000
  if (Math.abs(time - dawn) < 1.5 * HR) parts.push('Dawn')
  else if (Math.abs(time - dusk) < 1.5 * HR) parts.push('Dusk')
  if (b.solunar >= 1.0) parts.push('Major feeding period')
  else if (b.solunar >= 0.5) parts.push('Minor feeding period')
  if (b.wind >= 0.8)    parts.push('Calm winds')
  return parts.join(' + ') || 'Favorable conditions'
}

// ── getBestFishingTime ────────────────────────────────────────────────────────
// windMph: pass current wind speed from useWeather (or null if unknown).
// Returns null if tide data is unavailable.
export async function getBestFishingTime({ windMph = null } = {}) {
  const today = new Date()

  const [{ ok, data: tides }, solunar] = await Promise.all([
    getTidePredictions({ days: 2 }),
    Promise.resolve(getSolunarDay(today)),
  ])

  if (!ok || !tides.length) return null

  const sunTimes  = SunCalc.getTimes(today, LAT, LNG)
  const startTime = sunTimes.dawn    || sunTimes.sunrise
  const endTime   = sunTimes.dusk    || sunTimes.sunset
  if (!startTime || !endTime) return null

  // Build samples: one per 30-min slot from dawn to dusk
  const samples = []
  for (let t = new Date(startTime); t <= endTime; t = new Date(t.getTime() + SAMPLE_STEP_MS)) {
    const wScore = windScore(windMph)
    const tScore = tideFlowScore(t, tides)
    const dScore = dawnDuskScore(t, sunTimes)
    const sScore = solunarScore(t, solunar)
    const raw    = W_TIDE * tScore + W_DAWN * dScore + W_SOLUNAR * sScore + W_WIND * wScore
    samples.push({
      time:      new Date(t),
      score:     Math.round(raw * 100),
      breakdown: { tide: tScore, dawn: dScore, solunar: sScore, wind: wScore },
    })
  }

  // Find contiguous windows above threshold
  const windows = []
  let current = null
  for (const s of samples) {
    if (s.score >= WINDOW_THRESHOLD) {
      if (!current) {
        current = { start: s.time, end: s.time, peak: s, scores: [s.score] }
      } else {
        current.end = s.time
        current.scores.push(s.score)
        if (s.score > current.peak.score) current.peak = s
      }
    } else {
      if (current) { windows.push(current); current = null }
    }
  }
  if (current) windows.push(current)

  // Sort by avg score descending
  windows.sort((a, b) => {
    const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length
    return avg(b.scores) - avg(a.scores)
  })

  // Annotate top windows with a plain-English reason
  const topWindows = windows.slice(0, 2).map(w => ({
    ...w,
    reason: generateReason(w.peak, sunTimes),
  }))

  // Day rating 1-5 from the average of the top 3 samples
  const sorted = [...samples].sort((a, b) => b.score - a.score)
  const topAvg = sorted.slice(0, 3).reduce((s, v) => s + v.score, 0) / Math.min(3, sorted.length)
  const dayRating = topAvg >= 78 ? 5 : topAvg >= 63 ? 4 : topAvg >= 48 ? 3 : topAvg >= 33 ? 2 : 1

  return { samples, windows: topWindows, dayRating, solunar, sunTimes }
}
