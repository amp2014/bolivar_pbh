// Discovery script — tests TranStar CCTV camera IDs 170-200
// Filters by content-type: only image/jpeg responses are real cameras
// Run: node scripts/discover-ferry-cameras.js

const START = 170
const END   = 200
const BASE  = 'http://www.houstontranstar.org/snapshots/cctv/'

async function probe(id) {
  const url = `${BASE}${id}.jpg`
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    const ct  = res.headers.get('content-type') ?? ''
    const len = res.headers.get('content-length') ?? '?'
    const isImage = ct.startsWith('image/')
    return { id, status: res.status, isImage, ct, len }
  } catch {
    return { id, status: 'ERR', isImage: false, ct: '', len: 0 }
  }
}

const results = []
for (let id = START; id <= END; id++) {
  const r = await probe(id)
  const mark = r.isImage ? '✅' : (r.status === 'ERR' ? '⚠️ ' : '❌')
  console.log(`${mark}  ${id}  →  ${r.status}  ${r.ct}  (${r.len} bytes)`)
  results.push(r)
}

const working = results.filter(r => r.isImage).map(r => r.id)
console.log('\n─────────────────────────────')
console.log('Real camera IDs (image/jpeg):', working.length ? working.join(', ') : 'none found')
