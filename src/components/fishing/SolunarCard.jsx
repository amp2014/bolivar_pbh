import { useMemo } from 'react'
import { getSolunarDay } from '../../services/solunar'

function fmt(date) {
  let h = date.getHours(), m = date.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

function phaseIcon(phaseFraction) {
  // 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
  const p = phaseFraction
  if (p < 0.05 || p > 0.95) return '🌑'
  if (p < 0.23) return '🌒'
  if (p < 0.27) return '🌓'
  if (p < 0.48) return '🌔'
  if (p < 0.52) return '🌕'
  if (p < 0.73) return '🌖'
  if (p < 0.77) return '🌗'
  return '🌘'
}

function periodStatus(period) {
  const now = Date.now()
  if (now >= period.start && now <= period.end) return 'now'
  if (period.start > now && period.start - now < 2 * 60 * 60 * 1000) return 'next'
  return null
}

function PeriodRow({ period, label, isMajor }) {
  const status = periodStatus(period)
  const accent = status === 'now' ? '#2ab8c4' : status === 'next' ? '#e8a84a' : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 12px',
      borderRadius: '10px',
      background: accent ? `${accent}14` : 'transparent',
      border: `1px solid ${accent ?? 'var(--color-border)'}`,
      marginBottom: '6px',
    }}>
      <span style={{
        fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700,
        letterSpacing: '0.5px', textTransform: 'uppercase',
        color: isMajor ? 'var(--color-teal)' : 'var(--color-text-muted)',
        minWidth: 40,
      }}>
        {label}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)' }}>
          {fmt(period.peak)}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '8px' }}>
          {fmt(period.start)}–{fmt(period.end)}
        </span>
      </div>
      {status === 'now' && (
        <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#2ab8c4', letterSpacing: '0.5px' }}>
          NOW
        </span>
      )}
      {status === 'next' && (
        <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#e8a84a', letterSpacing: '0.5px' }}>
          NEXT
        </span>
      )}
    </div>
  )
}

export default function SolunarCard() {
  const data = useMemo(() => getSolunarDay(), [])

  const stars = Array.from({ length: 4 }, (_, i) => i < data.dayRating ? '★' : '☆').join('')

  return (
    <div style={{
      background: 'var(--color-sand-50, #fdfaf5)',
      border: '1px solid var(--color-border)',
      borderRadius: '16px',
      padding: '16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <p style={{
            fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
            letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 4px',
          }}>
            Feeding Times
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px', lineHeight: 1 }}>{phaseIcon(data.moonPhase.fraction)}</span>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--color-navy)' }}>
                {data.moonPhase.name}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                {Math.round(data.moonIllumination * 100)}% lit
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '16px', color: 'var(--color-teal)', letterSpacing: '-1px' }}>{stars}</span>
          <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', margin: '2px 0 0', letterSpacing: '0.3px' }}>
            SOLUNAR {data.dayRating}/4
          </p>
        </div>
      </div>

      {/* Major periods */}
      <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 6px' }}>
        Major Periods
      </p>
      {data.majorPeriods.map((p, i) => (
        <PeriodRow key={i} period={p} label="Major" isMajor={true} />
      ))}

      {/* Minor periods */}
      {data.minorPeriods.length > 0 && (
        <>
          <p style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '10px 0 6px' }}>
            Minor Periods
          </p>
          {data.minorPeriods.map((p, i) => (
            <PeriodRow key={i} period={p} label="Minor" isMajor={false} />
          ))}
        </>
      )}

      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontStyle: 'italic', margin: '12px 0 0', lineHeight: 1.4 }}>
        Solunar times are a guide — on the coast, tide movement usually matters more.
      </p>
    </div>
  )
}
