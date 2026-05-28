import { useState, useEffect } from 'react'
import { getBestFishingTime } from '../../services/bestTime'
import { useWeather } from '../../hooks/useWeather'

function fmt(date) {
  let h = date.getHours(), m = date.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

function StarRating({ rating }) {
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', letterSpacing: '-1px', color: 'var(--color-teal)' }}>
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {labels[rating]}
      </span>
    </div>
  )
}

function Sparkline({ samples }) {
  if (!samples?.length) return null
  const max   = Math.max(...samples.map(s => s.score), 1)
  const W     = 300
  const H     = 40
  const barW  = Math.max(3, Math.floor(W / samples.length) - 1)
  const gap   = W / samples.length

  return (
    <div style={{ overflowX: 'auto', marginTop: '12px' }}>
      <svg width={W} height={H + 16} style={{ display: 'block' }}>
        {samples.map((s, i) => {
          const barH = Math.max(2, Math.round((s.score / max) * H))
          const x    = i * gap
          const y    = H - barH
          const now  = Date.now()
          const isNow = s.time <= now && (samples[i + 1]?.time > now || i === samples.length - 1)
          const color = s.score >= 65 ? '#2ab8c4' : s.score >= 42 ? '#e8a84a' : '#d0d8e0'
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={1} fill={isNow ? '#1a3a5c' : color} />
              {i % 4 === 0 && (
                <text x={x + barW / 2} y={H + 13} textAnchor="middle"
                  style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', fill: '#a0aab4' }}>
                  {fmt(s.time).replace(/ (AM|PM)/, '')}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function WindowBlock({ win, index }) {
  if (!win) return null
  const isNow = Date.now() >= win.start && Date.now() <= win.end
  return (
    <div style={{
      background: index === 0 ? 'linear-gradient(135deg, #0F4A63 0%, #1B6B8A 100%)' : 'var(--color-sand-50, #fdfaf5)',
      border: index === 0 ? 'none' : '1px solid var(--color-border)',
      borderRadius: '14px',
      padding: '14px 16px',
      marginBottom: index === 0 ? '10px' : 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        {index === 0 && (
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Best Bite{isNow ? ' · NOW' : ''}
          </span>
        )}
        {index === 1 && (
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            2nd Window
          </span>
        )}
      </div>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: index === 0 ? '22px' : '18px',
        fontWeight: 700,
        color: index === 0 ? 'white' : 'var(--color-navy)',
        margin: '0 0 4px',
      }}>
        {fmt(win.start)} – {fmt(win.end)}
      </p>
      <p style={{
        fontSize: '13px',
        color: index === 0 ? 'rgba(255,255,255,0.75)' : 'var(--color-text-muted)',
        fontFamily: 'var(--font-body)',
        margin: 0,
      }}>
        {win.reason}
      </p>
    </div>
  )
}

export default function BestTimeCard() {
  const { weather } = useWeather()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getBestFishingTime({ windMph: weather?.wind ?? null }).then(result => {
      setData(result)
      setLoading(false)
    })
  }, [weather?.wind])

  if (loading) {
    return (
      <div style={{
        borderRadius: '16px', padding: '18px',
        background: 'linear-gradient(135deg, #0F4A63 0%, #1B6B8A 100%)',
      }}>
        <div style={{ height: 14, width: '50%', borderRadius: 6, background: 'rgba(255,255,255,0.2)', marginBottom: 10 }} />
        <div style={{ height: 28, width: '75%', borderRadius: 6, background: 'rgba(255,255,255,0.25)' }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{
        borderRadius: '16px', padding: '18px',
        background: 'var(--color-sand-50, #fdfaf5)',
        border: '1px solid var(--color-border)',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', margin: 0 }}>
          Couldn't compute best time — tide data unavailable.
        </p>
      </div>
    )
  }

  const top = data.windows[0] ?? null
  const second = data.windows[1] ?? null

  return (
    <div>
      {/* Day rating */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{
          fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
          letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, margin: 0,
        }}>
          Best Time to Fish Today
        </p>
        <StarRating rating={data.dayRating} />
      </div>

      {top ? (
        <WindowBlock win={top} index={0} />
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #0F4A63 0%, #1B6B8A 100%)',
          borderRadius: '14px', padding: '16px',
          marginBottom: '10px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-body)', fontSize: '14px', margin: 0 }}>
            No standout window today — conditions are moderate throughout.
          </p>
        </div>
      )}

      {second && <WindowBlock win={second} index={1} />}

      {/* Expand / sparkline */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '12px', color: 'var(--color-teal)', fontFamily: 'var(--font-body)',
          fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        {expanded ? '▲ Hide score chart' : '▼ Show hourly score chart'}
      </button>

      {expanded && (
        <div style={{ marginTop: '8px', padding: '12px', background: 'var(--color-sand-50, #fdfaf5)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Score across today · teal = best · gold = good
          </p>
          <Sparkline samples={data.samples} />
        </div>
      )}

      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontStyle: 'italic', margin: '10px 0 0', lineHeight: 1.4 }}>
        Based on tide, sun, moon and wind. Fish don't read charts — local knowledge wins.
      </p>
    </div>
  )
}
