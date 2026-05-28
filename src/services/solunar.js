// Solunar feeding times — pure client-side astronomy via suncalc.
// No API, no key. Coordinates: 604 Nelson Ave, Bolivar TX.
import SunCalc from 'suncalc'

const LAT = 29.4583
const LNG = -94.6369

// Sample moon altitude every 5 min over 24 hrs to find transit (max alt) and
// anti-transit (min alt). Quadratic interpolation refines the peak time.
function findMajorPeaks(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const STEP_MS = 5 * 60 * 1000
  const STEPS   = 288 // 24 * 60 / 5

  const alts = []
  for (let i = 0; i <= STEPS; i++) {
    const t = new Date(start.getTime() + i * STEP_MS)
    alts.push({ t, alt: SunCalc.getMoonPosition(t, LAT, LNG).altitude })
  }

  let maxIdx = 0, minIdx = 0
  for (let i = 1; i < alts.length; i++) {
    if (alts[i].alt > alts[maxIdx].alt) maxIdx = i
    if (alts[i].alt < alts[minIdx].alt) minIdx = i
  }

  return {
    overhead:  quadPeak(alts, maxIdx,  STEP_MS),
    underfoot: quadPeak(alts, minIdx, STEP_MS),
  }
}

// Quadratic interpolation: refine peak time from three surrounding samples.
function quadPeak(alts, idx, stepMs) {
  if (idx === 0 || idx === alts.length - 1) return alts[idx].t
  const a0 = alts[idx - 1].alt
  const a1 = alts[idx].alt
  const a2 = alts[idx + 1].alt
  const denom = a0 - 2 * a1 + a2
  if (Math.abs(denom) < 1e-12) return alts[idx].t
  const frac = (a0 - a2) / (2 * denom) // offset in step units from idx
  return new Date(alts[idx].t.getTime() + frac * stepMs)
}

function phaseName(phase) {
  // phase 0..1 from getMoonIllumination (0 = new, 0.5 = full, 1 = back to new)
  if (phase < 0.025 || phase >= 0.975) return 'New Moon'
  if (phase < 0.225)  return 'Waxing Crescent'
  if (phase < 0.275)  return 'First Quarter'
  if (phase < 0.475)  return 'Waxing Gibbous'
  if (phase < 0.525)  return 'Full Moon'
  if (phase < 0.725)  return 'Waning Gibbous'
  if (phase < 0.775)  return 'Last Quarter'
  return 'Waning Crescent'
}

function dayRating(phase) {
  // 4 = strongest (near new or full moon), 1 = weakest (near quarters)
  // Distance to nearest new (0) or full (0.5) in phase units
  const d = Math.min(Math.abs(phase), Math.abs(phase - 0.5), Math.abs(phase - 1))
  if (d < 0.04) return 4
  if (d < 0.09) return 3
  if (d < 0.18) return 2
  return 1
}

// ── getSolunarDay ─────────────────────────────────────────────────────────────
// Returns solunar data for the given date (defaults to today).
// All Date objects are in local JS time (browser uses America/Chicago if set
// to local TZ, which is correct for Bolivar TX users).
export function getSolunarDay(date = new Date()) {
  const { overhead, underfoot } = findMajorPeaks(date)

  const HR = 60 * 60 * 1000

  // Major periods: ±60 min around each peak (2-hr windows)
  const majorPeriods = [
    { peak: overhead,  start: new Date(overhead.getTime()  - HR), end: new Date(overhead.getTime()  + HR) },
    { peak: underfoot, start: new Date(underfoot.getTime() - HR), end: new Date(underfoot.getTime() + HR) },
  ].sort((a, b) => a.peak - b.peak)

  // Minor periods: ±30 min around moonrise and moonset (1-hr windows)
  const moonTimes = SunCalc.getMoonTimes(date, LAT, LNG)
  const minorPeriods = []
  const HALF = 30 * 60 * 1000
  if (moonTimes.rise) {
    const r = moonTimes.rise
    minorPeriods.push({ peak: r, start: new Date(r.getTime() - HALF), end: new Date(r.getTime() + HALF) })
  }
  if (moonTimes.set) {
    const s = moonTimes.set
    minorPeriods.push({ peak: s, start: new Date(s.getTime() - HALF), end: new Date(s.getTime() + HALF) })
  }
  minorPeriods.sort((a, b) => a.peak - b.peak)

  const illum = SunCalc.getMoonIllumination(date)

  return {
    majorPeriods,
    minorPeriods,
    moonPhase: { fraction: illum.phase, name: phaseName(illum.phase) },
    moonIllumination: illum.fraction,
    dayRating: dayRating(illum.phase),
  }
}
