// Seeds devices and guest_feature_flags tables via Supabase REST API.
// Run AFTER the DDL migration has been applied in the SQL editor.
// Usage: node scripts/seed-devices-and-flags.js

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load env from .env (no dotenv dep needed — simple parse)
function loadEnv() {
  const envPath = join(__dir, '..', '.env')
  const text = readFileSync(envPath, 'utf8')
  const vars = {}
  for (const line of text.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && rest.length) vars[k.trim()] = rest.join('=').trim()
  }
  return vars
}

const env = loadEnv()
const BASE = env.VITE_SUPABASE_URL
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!BASE || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const HEADERS = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

async function supabase(method, table, body) {
  const res = await fetch(`${BASE}/rest/v1/${table}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, ok: res.ok, data }
}

async function tableExists(table) {
  const res = await fetch(`${BASE}/rest/v1/${table}?limit=0`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  return res.status !== 404
}

// ── Seed data ─────────────────────────────────────────────────

const FLAGS = [
  { feature_name: 'house_info',    label: 'House Info & Codes',  visible_to_guest: false },
  { feature_name: 'supplies',      label: 'Supply Tracker',       visible_to_guest: false },
  { feature_name: 'inventory',     label: 'Inventory',            visible_to_guest: true  },
  { feature_name: 'projects',      label: 'House Projects',       visible_to_guest: false },
  { feature_name: 'bookings',      label: 'Stays & Bookings',     visible_to_guest: false },
  { feature_name: 'announcements', label: 'Announcements',        visible_to_guest: true  },
  { feature_name: 'photos',        label: 'Photo Gallery',        visible_to_guest: true  },
  { feature_name: 'emergency',     label: 'Emergency Info',       visible_to_guest: true  },
  { feature_name: 'local',         label: 'Local & Ferry',        visible_to_guest: true  },
  { feature_name: 'beach_access',  label: 'Beach Access',         visible_to_guest: true  },
]

const DEVICES = [
  {
    name: 'Breaker Panel',
    type: 'electrical',
    location: 'Near the refrigerator',
    instructions: 'On arrival: turn ON breakers with yellow tags. On departure: turn OFF all yellow-tagged breakers. The yellow tags identify the house circuit breakers — other breakers should be left alone.',
    guest_visible: false,
    sort_order: 10,
  },
  {
    name: 'Main Room AC Unit',
    type: 'hvac',
    location: 'Main room / living area',
    instructions: 'Controlled by the remote with the green cover — usually kept on the kitchen table. Turn on upon arrival, turn off before leaving. The wall lamps are touch-activated (tap to toggle).',
    guest_visible: true,
    sort_order: 20,
  },
  {
    name: 'Bedroom AC Units',
    type: 'hvac',
    location: 'Individual bedrooms',
    instructions: 'Each occupied bedroom has its own window AC unit. Turn on only the units for bedrooms in use. Turn all units off before leaving.',
    guest_visible: true,
    sort_order: 30,
  },
  {
    name: 'Ice Maker',
    type: 'appliance',
    location: 'Kitchen',
    instructions: 'On arrival: fill with water and turn on. On departure: unplug and drain the water. Do not leave it running while the house is unoccupied.',
    guest_visible: true,
    sort_order: 40,
  },
  {
    name: 'Bathroom Exhaust Fan',
    type: 'ventilation',
    location: 'Bathroom',
    instructions: 'Turn off before leaving the house — easy to forget. It is included on the departure checklist.',
    guest_visible: true,
    sort_order: 50,
  },
]

// ── Run ───────────────────────────────────────────────────────

async function run() {
  console.log('Checking tables exist...\n')

  const devicesOk = await tableExists('devices')
  const flagsOk   = await tableExists('guest_feature_flags')

  if (!devicesOk || !flagsOk) {
    console.error('❌  One or both tables do not exist yet.')
    console.error('    Run the DDL migration first:')
    console.error('    supabase/migrations/20260527_create_devices_and_guest_feature_flags.sql')
    console.error('    → https://supabase.com/dashboard/project/lnyjouytofrqupnfojil/sql/new')
    process.exit(1)
  }

  console.log('✅  Both tables exist. Seeding...\n')

  // ── guest_feature_flags ──────────────────────────
  console.log('Inserting guest_feature_flags...')
  const flagRes = await supabase('POST', 'guest_feature_flags', FLAGS)
  if (flagRes.ok) {
    console.log(`  ✅  Inserted ${Array.isArray(flagRes.data) ? flagRes.data.length : '?'} flag rows`)
  } else {
    // 409 = unique conflict means already seeded — that's fine
    if (flagRes.status === 409 || (typeof flagRes.data?.message === 'string' && flagRes.data.message.includes('duplicate'))) {
      console.log('  ℹ️   Flags already seeded (conflict on unique key) — skipping')
    } else {
      console.error('  ❌  Flags insert failed:', flagRes.status, JSON.stringify(flagRes.data))
    }
  }

  // ── devices ──────────────────────────────────────
  console.log('\nInserting devices...')
  for (const device of DEVICES) {
    const r = await supabase('POST', 'devices', [device])
    if (r.ok) {
      console.log(`  ✅  ${device.name}`)
    } else {
      console.error(`  ❌  ${device.name}: ${r.status} ${JSON.stringify(r.data)}`)
    }
  }

  // ── Verify ────────────────────────────────────────
  console.log('\n── Verification ─────────────────────────────')

  const vFlags   = await supabase('GET', 'guest_feature_flags?select=feature_name,visible_to_guest&order=feature_name', null)
  const vDevices = await supabase('GET', 'devices?select=name,sort_order&order=sort_order', null)

  console.log(`\nguest_feature_flags (${Array.isArray(vFlags.data) ? vFlags.data.length : '?'} rows):`)
  if (Array.isArray(vFlags.data)) {
    for (const f of vFlags.data) {
      console.log(`  ${f.visible_to_guest ? '👁 ' : '🔒'} ${f.feature_name}`)
    }
  }

  console.log(`\ndevices (${Array.isArray(vDevices.data) ? vDevices.data.length : '?'} rows):`)
  if (Array.isArray(vDevices.data)) {
    for (const d of vDevices.data) {
      console.log(`  [${String(d.sort_order).padStart(2)}] ${d.name}`)
    }
  }

  console.log('\nDone.')
}

run().catch((err) => { console.error('Fatal:', err); process.exit(1) })
