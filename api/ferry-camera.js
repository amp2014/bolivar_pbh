// Proxy TranStar CCTV snapshots server-side to avoid mixed-content (HTTP→HTTPS) browser blocks.
// GET /api/ferry-camera?id=180&t=<timestamp>

const VALID_IDS = new Set([170,171,172,173,174,175,176,177,178,179,180,181,182,183])

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const id = parseInt(req.query.id, 10)
  if (!VALID_IDS.has(id)) {
    return res.status(400).json({ error: 'Invalid camera ID' })
  }

  const upstream = `http://www.houstontranstar.org/snapshots/cctv/${id}.jpg`

  let response
  try {
    response = await fetch(upstream, { signal: AbortSignal.timeout(8000) })
  } catch {
    return res.status(502).json({ error: 'Camera fetch failed' })
  }

  if (!response.ok) {
    return res.status(502).json({ error: `Upstream returned ${response.status}` })
  }

  const ct = response.headers.get('content-type') ?? 'image/jpeg'
  if (!ct.startsWith('image/')) {
    return res.status(502).json({ error: 'Upstream returned non-image' })
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  res.setHeader('Content-Type', ct)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Length', buffer.length)
  return res.status(200).send(buffer)
}
