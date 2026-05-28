// Rip current risk from NWS API (api.weather.gov). Free, no key required.
// SEASONAL: Surf Zone Forecast typically only issued Memorial Day–Labor Day.
// Outside that window (or any fetch failure) → returns risk: 'unknown'.
// Cache: localStorage, 45-min TTL.

const BEACH_LAT  = 29.4583
const BEACH_LNG  = -94.6369
const USER_AGENT = 'PhillipsBolivarBeachHouse (amphillips2014@gmail.com)'
const CACHE_KEY  = 'pbh_rip_current_v1'
const CACHE_TTL  = 45 * 60 * 1000

function nwsHeaders() {
  return {
    'User-Agent': USER_AGENT,
    'Accept':     'application/geo+json',
  }
}

function parseRiskFromText(text) {
  const t = text.toUpperCase()
  // NWS uses standardized phrasing: "RIP CURRENT RISK...LOW/MODERATE/HIGH"
  if (/RIP CURR[A-Z ]+[.:\-]\s*HIGH/.test(t) || /HIGH\s+RIP CURR/.test(t))     return 'high'
  if (/RIP CURR[A-Z ]+[.:\-]\s*MOD/.test(t)  || /MODERATE\s+RIP CURR/.test(t)) return 'moderate'
  if (/RIP CURR[A-Z ]+[.:\-]\s*LOW/.test(t)  || /LOW\s+RIP CURR/.test(t))      return 'low'
  return null
}

function unknown() {
  return { risk: 'unknown', source: null, issuedAt: null, detail: null }
}

async function fetchRipCurrent() {
  try {
    // Step 1 — resolve point to get forecast zone and office
    const pointRes = await fetch(
      `https://api.weather.gov/points/${BEACH_LAT},${BEACH_LNG}`,
      { headers: nwsHeaders() }
    )
    if (!pointRes.ok) return unknown()
    const point = await pointRes.json()

    const forecastZoneUrl = point.properties?.forecastZone ?? ''
    const zoneId          = forecastZoneUrl.split('/').pop()  // e.g. "TXZ163"
    const officeId        = point.properties?.gridId ?? 'HGX'

    // Step 2 — active alerts for the forecast zone
    if (zoneId) {
      const alertRes = await fetch(
        `https://api.weather.gov/alerts/active?zone=${zoneId}`,
        { headers: nwsHeaders() }
      )
      if (alertRes.ok) {
        const alertData = await alertRes.json()
        for (const f of (alertData.features ?? [])) {
          const event    = f.properties?.event      ?? ''
          const headline = f.properties?.headline   ?? ''
          const desc     = f.properties?.description ?? ''
          const combined = `${event} ${headline} ${desc}`
          const risk     = parseRiskFromText(combined)
          if (risk) {
            return {
              risk,
              source:    event,
              issuedAt:  f.properties?.sent ?? null,
              detail:    desc.slice(0, 800),
            }
          }
          // A "Rip Current Statement" without an explicit level → moderate
          if (/RIP CURRENT STATEMENT/i.test(event)) {
            return { risk: 'moderate', source: event, issuedAt: f.properties?.sent ?? null, detail: desc.slice(0, 800) }
          }
        }
      }
    }

    // Step 3 — Surf Zone Forecast (SRF) product text from NWS office
    const srfListRes = await fetch(
      `https://api.weather.gov/products/types/SRF/locations/${officeId}`,
      { headers: nwsHeaders() }
    )
    if (srfListRes.ok) {
      const srfList = await srfListRes.json()
      const latestId = srfList['@graph']?.[0]?.['@id']
      if (latestId) {
        const prodRes = await fetch(latestId, { headers: nwsHeaders() })
        if (prodRes.ok) {
          const prod = await prodRes.json()
          const text = prod.productText ?? ''
          const risk = parseRiskFromText(text)
          if (risk) {
            return {
              risk,
              source:   'NWS Surf Zone Forecast',
              issuedAt: prod.issuanceTime ?? null,
              detail:   text.slice(0, 800),
            }
          }
        }
      }
    }

    return unknown()
  } catch {
    return unknown()
  }
}

// ── getRipCurrentRisk ─────────────────────────────────────────────────────────
// Returns { risk, source, issuedAt, detail }.
// risk: 'low' | 'moderate' | 'high' | 'unknown'
export async function getRipCurrentRisk() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data
  } catch { /* bad cache — fall through */ }

  const result = await fetchRipCurrent()
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }))
  } catch { /* storage quota */ }
  return result
}
