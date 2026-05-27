// Proxies live ferry travel time data from TranStar's ASMX web service.
// The TranStar page fires two POST requests to DataRetriever.asmx/GetRouteInfo
// which return comma-delimited strings: [score, reportingTime, ..., displayTime]
// "No Value" means the sensor has no reading right now.

const ASMX = 'https://traffic.houstontranstar.org/ferrytimes/DataRetriever.asmx/GetRouteInfo'

async function fetchRoute(startroute, endroute) {
  const res = await fetch(ASMX, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ startroute, endroute }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`ASMX ${res.status}`)
  const { d } = await res.json()
  return d === 'No Value' ? null : d
}

function parseRoute(raw) {
  if (!raw) return { reporting_time: null, travel_time: null, available: false }

  const parts = raw.split(',')
  // parts[1] = "5/27/2026 8:14:43 AM"  parts[4] = "45+ MIN"
  const rawTime = parts[1]?.trim() ?? null
  const travelTime = parts[4]?.trim() ?? null

  let reporting_time = null
  if (rawTime) {
    const d = new Date(rawTime)
    if (!isNaN(d)) {
      reporting_time = d.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    }
  }

  return {
    reporting_time,
    travel_time: travelTime ?? null,
    available: !!(reporting_time || travelTime),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const unavailable = {
    reporting_time: null,
    travel_time: null,
    available: false,
  }

  let galvRaw = null
  let bolivRaw = null

  try {
    ;[galvRaw, bolivRaw] = await Promise.all([
      fetchRoute('Broadway_6th', 'SH-87_FrenchTown'),
      fetchRoute('SH-87_22nd', 'SH-87_GalvestonLanding'),
    ])
  } catch {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      seawall_to_bolivar: unavailable,
      bolivar_to_galveston: unavailable,
      fetched_at: new Date().toISOString(),
      source: 'transtar',
      error: 'transtar_unavailable',
    })
  }

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300')
  return res.status(200).json({
    seawall_to_bolivar: parseRoute(galvRaw),
    bolivar_to_galveston: parseRoute(bolivRaw),
    fetched_at: new Date().toISOString(),
    source: 'transtar',
  })
}
