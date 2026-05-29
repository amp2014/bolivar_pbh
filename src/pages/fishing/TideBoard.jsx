import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTidePredictions, getCurrentTideState, getWaterTemp } from '../../services/noaa'
import { useWeather } from '../../hooks/useWeather'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatTime(date) {
  let h = date.getHours(), m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function dayLabel(date) {
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return `${DAY_NAMES[date.getDay()]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`
}

function stateLabel(state) {
  return state
    ? state.charAt(0).toUpperCase() + state.slice(1)
    : '—'
}

function Skeleton({ width = '100%', height = 18, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'var(--color-sand-100)',
      animation: 'tide-pulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}

// ── CurrentConditionsCard ─────────────────────────────────────────────────────
export function CurrentConditionsCard({ onSeeAll }) {
  const [tideState, setTideState]   = useState(null)
  const [waterTemp, setWaterTemp]   = useState(null)
  const [tideLoading, setTideLoad]  = useState(true)
  const { weather } = useWeather()

  useEffect(() => {
    Promise.all([getCurrentTideState(), getWaterTemp()]).then(([t, w]) => {
      setTideState(t.ok ? t : null)
      setWaterTemp(w.temp_f)
      setTideLoad(false)
    })
  }, [])

  return (
    <>
      <style>{`
        @keyframes tide-pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.4 }
        }
      `}</style>
      <div style={{
        background: 'linear-gradient(135deg, #0F4A63 0%, #1B6B8A 100%)',
        borderRadius: '16px', padding: '18px 20px',
        color: 'white',
      }}>
        {tideLoading ? (
          <div>
            <Skeleton height={32} width="60%" style={{ background: 'rgba(255,255,255,0.2)', marginBottom: 8 }} />
            <Skeleton height={18} width="80%" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>
        ) : tideState ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700 }}>
                {stateLabel(tideState.state)}
              </span>
              <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.8)' }}>
                · {tideState.height_ft} ft
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>
              Next: {tideState.next.type === 'H' ? 'High' : 'Low'} at {formatTime(tideState.next.datetime)}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {waterTemp != null && (
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)' }}>
                  💧 Water {waterTemp}°F
                </span>
              )}
              {weather && (
                <>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)' }}>
                    🌡️ Air {weather.temp}°F
                  </span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)' }}>
                    💨 {weather.wind} mph
                  </span>
                </>
              )}
            </div>
          </>
        ) : (
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)', margin: 0 }}>
            Couldn't load tides
          </p>
        )}

        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{
              marginTop: '14px', background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-full)',
              color: 'white', padding: '7px 16px', fontSize: '13px',
              fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
            }}
          >
            See 7-day tides →
          </button>
        )}
      </div>
    </>
  )
}

// ── TideBoard page ────────────────────────────────────────────────────────────
export default function TideBoard() {
  const navigate                       = useNavigate()
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const { ok, data } = await getTidePredictions({ days: 7 })
    if (!ok) { setError(true); setLoading(false); return }
    setPredictions(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Group predictions by calendar day
  const byDay = {}
  for (const p of predictions) {
    const key = p.datetime.toDateString()
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(p)
  }
  const days = Object.keys(byDay)

  const todayStr = new Date().toDateString()

  return (
    <>
      <style>{`
        @keyframes tide-pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.4 }
        }
      `}</style>

      <div style={{
        paddingTop: 'calc(var(--safe-top, 0px) + 20px)',
        paddingBottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom, 0px) + 24px)',
      }}>

        {/* Header */}
        <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/fishing')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '14px', fontFamily: 'var(--font-body)', padding: 0 }}
          >
            ← Back
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
            Tides
          </h1>
        </div>

        {/* Current conditions card */}
        <div style={{ padding: '0 16px 20px' }}>
          <CurrentConditionsCard />
        </div>

        {/* 7-day list */}
        <div style={{ padding: '0 16px' }}>
          <p style={{
            fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
            letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px',
          }}>
            7-Day Forecast · Galveston Pier 21
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1,2,3].map(i => <Skeleton key={i} height={80} style={{ borderRadius: 14 }} />)}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '12px' }}>
                Couldn't load tides
              </p>
              <button onClick={load} style={{
                background: 'transparent', color: 'var(--color-teal)',
                border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-full)',
                padding: '8px 20px', fontSize: '14px', fontFamily: 'var(--font-body)',
                fontWeight: 600, cursor: 'pointer',
              }}>
                Retry
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {days.map(dayStr => {
                const isToday = dayStr === todayStr
                const events  = byDay[dayStr]
                return (
                  <div key={dayStr} style={{
                    background: isToday ? 'var(--color-navy)' : 'var(--color-sand-50, #fdfaf5)',
                    border: isToday ? 'none' : '1px solid var(--color-border)',
                    borderRadius: '14px', padding: '14px 16px',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '14px', fontWeight: 700,
                      color: isToday ? 'white' : 'var(--color-navy)',
                      margin: '0 0 10px',
                    }}>
                      {dayLabel(new Date(dayStr))}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                      {events.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                          <span style={{
                            display: 'inline-block', width: '22px', height: '22px',
                            lineHeight: '22px', textAlign: 'center', borderRadius: '6px',
                            fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                            background: ev.type === 'H'
                              ? (isToday ? '#2ab8c4' : 'var(--color-teal)')
                              : (isToday ? 'rgba(255,255,255,0.15)' : 'var(--color-sand-100)'),
                            color: ev.type === 'H' ? 'white' : (isToday ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)'),
                          }}>
                            {ev.type}
                          </span>
                          <span style={{
                            fontSize: '14px', fontFamily: 'var(--font-body)',
                            color: isToday ? 'rgba(255,255,255,0.9)' : 'var(--color-text)',
                          }}>
                            {formatTime(ev.datetime)}
                          </span>
                          <span style={{
                            fontSize: '13px', fontFamily: 'var(--font-mono)',
                            color: isToday ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)',
                          }}>
                            {ev.height_ft.toFixed(2)} ft
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
