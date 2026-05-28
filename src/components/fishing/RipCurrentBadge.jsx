import { useState, useEffect } from 'react'
import { getRipCurrentRisk } from '../../services/ripCurrent'

const CONFIG = {
  low: {
    bg:      '#e6f9f0',
    border:  '#34c679',
    text:    '#0e6b35',
    label:   'Rip Current Risk: Low',
    dot:     '#34c679',
    guidance: 'Generally safe near a lifeguard; currents still possible near jetties and groins.',
  },
  moderate: {
    bg:      '#fff7e6',
    border:  '#e8a84a',
    text:    '#7a4d00',
    label:   'Rip Current Risk: Moderate',
    dot:     '#e8a84a',
    guidance: 'Life-threatening rip currents possible. Only experienced swimmers in the surf.',
  },
  high: {
    bg:      '#fef0ee',
    border:  '#e85d4a',
    text:    '#7a1a0e',
    label:   'Rip Current Risk: HIGH',
    dot:     '#e85d4a',
    guidance: 'Life-threatening rip currents likely. Stay out of the surf.',
  },
  unknown: {
    bg:      'var(--color-sand-100)',
    border:  'var(--color-border)',
    text:    'var(--color-text-muted)',
    label:   'Rip current risk: not available',
    dot:     'var(--color-border)',
    guidance: null,
  },
}

function fmt(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  } catch { return null }
}

export default function RipCurrentBadge({ compact = false }) {
  const [rip,      setRip]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getRipCurrentRisk().then(r => { setRip(r); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div style={{
        height: 40, borderRadius: 10,
        background: 'var(--color-sand-100)',
        animation: 'pbh-pulse 1.4s ease-in-out infinite',
      }} />
    )
  }

  const risk = rip?.risk ?? 'unknown'
  const cfg  = CONFIG[risk] ?? CONFIG.unknown

  // compact mode: just the inline badge, no expand
  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderRadius: '20px',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: cfg.text, letterSpacing: '0.2px' }}>
          {cfg.label}
        </span>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '11px 14px', borderRadius: '12px',
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', color: cfg.text }}>
          {cfg.label}
        </span>
        {risk !== 'unknown' && cfg.guidance && (
          <span style={{ fontSize: '12px', color: cfg.text, opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {expanded && cfg.guidance && (
        <div style={{
          marginTop: '4px', padding: '12px 14px',
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          borderRadius: '12px',
        }}>
          <p style={{ fontSize: '13px', color: cfg.text, fontFamily: 'var(--font-body)', margin: 0, lineHeight: 1.5 }}>
            {cfg.guidance}
          </p>
          {rip?.issuedAt && (
            <p style={{ fontSize: '11px', color: cfg.text, opacity: 0.6, fontFamily: 'var(--font-mono)', margin: '6px 0 0' }}>
              Issued: {fmt(rip.issuedAt)} · NWS
            </p>
          )}
          {rip?.detail && (
            <details style={{ marginTop: '8px' }}>
              <summary style={{ fontSize: '11px', color: cfg.text, opacity: 0.7, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                Full advisory text
              </summary>
              <pre style={{
                fontSize: '11px', color: cfg.text, fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap', margin: '6px 0 0', opacity: 0.8,
              }}>
                {rip.detail}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
