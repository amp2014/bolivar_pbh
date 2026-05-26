import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useWeather } from '../../hooks/useWeather'

const FERRY_REMINDER = '🚢 Heading to Bolivar? Check the ferry card for live cameras + wait times'
const SEPARATOR_STYLE = { color: 'rgba(126,200,200,0.3)', padding: '0 18px' }

// ── Per-source async helpers (module level, no component state) ──

async function fetchWhosThere(today) {
  const { data } = await supabase
    .from('bookings')
    .select('guest_name')
    .neq('status', 'cancelled')
    .lte('start_date', today)
    .gte('end_date', today)
  if (!data?.length) return null
  if (data.length === 1) return `🏖 ${data[0].guest_name} is at the house!`
  const names = data.map((b) => b.guest_name).join(' and ')
  return `🏖 ${names} are both at the house!`
}

async function fetchUpcoming(today) {
  const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('bookings')
    .select('guest_name, start_date')
    .neq('status', 'cancelled')
    .gt('start_date', today)
    .lte('start_date', in14)
    .order('start_date', { ascending: true })
    .limit(1)
  if (!data?.length) return null
  const days = Math.ceil(
    (new Date(data[0].start_date) - new Date(today)) / 86400000
  )
  return `📅 ${data[0].guest_name} arrives in ${days} day${days !== 1 ? 's' : ''}`
}

async function fetchSupplyAlert() {
  const { data: outData } = await supabase
    .from('supplies').select('name').eq('status', 'out').limit(1)
  if (outData?.length) return `⚠️ ${outData[0].name} is OUT at the house`
  const { data: lowData } = await supabase
    .from('supplies').select('name').eq('status', 'low').limit(1)
  if (lowData?.length) return `📦 ${lowData[0].name} is running low`
  return null
}

async function fetchProject() {
  const { data } = await supabase
    .from('projects')
    .select('title')
    .eq('status', 'open')
    .order('priority', { ascending: true })
    .limit(1)
  if (!data?.length) return null
  return `🔧 Open project: ${data[0].title}`
}

async function fetchAnnouncement() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data } = await supabase
    .from('announcements')
    .select('author_name, body')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!data?.length) return null
  const truncated =
    data[0].body.length > 60 ? data[0].body.slice(0, 60) + '…' : data[0].body
  const author = data[0].author_name ?? 'Phillips House'
  return `📢 ${author}: "${truncated}"`
}

async function buildItems(facts, weather) {
  const today = new Date().toISOString().split('T')[0]
  const items = []

  // a) 3 random facts
  if (facts.length > 0) {
    const shuffled = [...facts].sort(() => Math.random() - 0.5)
    shuffled.slice(0, 3).forEach((f) => items.push(`🗺 ${f.short_fact}`))
  }

  // b-g) parallel async sources — failures silently skipped
  const results = await Promise.allSettled([
    fetchWhosThere(today),
    fetchUpcoming(today),
    fetchSupplyAlert(),
    fetchProject(),
    fetchAnnouncement(),
  ])
  const [whosThere, upcoming, supply, project, announcement] = results.map(
    (r) => (r.status === 'fulfilled' ? r.value : null)
  )

  if (whosThere)    items.push(whosThere)
  if (upcoming)     items.push(upcoming)

  // d) weather
  if (weather) {
    items.push(`🌤 ${weather.temp}°F in Bolivar · ${weather.label} · winds ${weather.wind} mph`)
  }

  if (supply)       items.push(supply)
  if (project)      items.push(project)
  if (announcement) items.push(announcement)

  // h) ferry reminder — always
  items.push(FERRY_REMINDER)

  // minimum 3 items — pad with more facts if needed
  if (items.length < 3 && facts.length > 0) {
    const extra = facts.filter((f) => !items.some((i) => i.includes(f.short_fact.slice(0, 20))))
    extra.slice(0, 3 - items.length).forEach((f) => items.push(`🗺 ${f.short_fact}`))
  }

  return items
}

// ── Component ─────────────────────────────────────────────────

export default function TickerBanner({ facts }) {
  const { weather } = useWeather()
  const [items, setItems] = useState([])
  const [duration, setDuration] = useState(60)
  const trackRef = useRef(null)

  useEffect(() => {
    // Inject keyframe once
    if (!document.getElementById('pbh-ticker-style')) {
      const style = document.createElement('style')
      style.id = 'pbh-ticker-style'
      style.textContent = `
        @keyframes pbh-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .pbh-ticker-track:hover { animation-play-state: paused; }
      `
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const result = await buildItems(facts, weather)
      if (!cancelled) setItems(result)
    }
    run()
    const interval = setInterval(run, 10 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [facts, weather]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (trackRef.current && items.length > 0) {
      const half = trackRef.current.scrollWidth / 2
      setDuration(Math.max(20, Math.round(half / 60)))
    }
  }, [items])

  if (items.length === 0) return null

  const doubled = [...items, ...items]

  return (
    <div style={{
      background: '#0F4A63',
      height: '28px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      <div
        ref={trackRef}
        className="pbh-ticker-track"
        style={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          animation: `pbh-ticker ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {doubled.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              color: '#7EC8C8',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.15px',
            }}>
              {item}
            </span>
            <span style={SEPARATOR_STYLE} aria-hidden>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
