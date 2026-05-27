import { useState } from 'react'

const DIRECTIONS = [
  'Leave the house, cross the bridge to Hwy 87',
  'Turn LEFT on Hwy 87',
  'Drive approximately 6 minutes',
  'When you see the electrical transfer station on the LEFT, turn RIGHT on Rettilion Road',
]

export default function BeachAccessCard() {
  const [dirOpen, setDirOpen] = useState(true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Parking Pass */}
      <div className="card" style={{ background: 'var(--color-teal-xlight)', border: '1px solid rgba(0,150,136,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '22px', lineHeight: 1.1, flexShrink: 0 }}>🅿️</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>
              Parking Pass Required
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-navy)', lineHeight: 1.5, opacity: 0.75, fontFamily: 'var(--font-body)' }}>
              Take a pass from the house and place it in your windshield. Return it before leaving.
            </p>
          </div>
        </div>
      </div>

      {/* Closest Access Point */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <p style={mono}>Closest Access Point</p>
          <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-navy)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            Hwy 87 @ Rettilion Road
          </p>
        </div>

        {/* Directions toggle */}
        <button
          onClick={() => setDirOpen((o) => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '8px',
            padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: dirOpen ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <p style={{ ...mono, margin: 0 }}>Directions from the house</p>
          <span style={{
            color: 'var(--color-text-muted)', fontSize: '12px', flexShrink: 0,
            display: 'inline-block',
            transform: dirOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}>▾</span>
        </button>

        {dirOpen && (
          <div style={{ padding: '12px 16px 14px' }}>
            {DIRECTIONS.map((text, i) => (
              <div key={i} style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                marginBottom: i < DIRECTIONS.length - 1 ? '10px' : '14px',
              }}>
                <span style={{
                  flexShrink: 0, width: '22px', height: '22px',
                  borderRadius: '50%', background: 'var(--color-teal-xlight)',
                  color: 'var(--color-teal)', fontSize: '11px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', marginTop: '1px',
                }}>
                  {i + 1}
                </span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.45, margin: 0 }}>
                  {text}
                </p>
              </div>
            ))}

            {/* Sand warning */}
            <div style={{
              background: '#FFF3CD',
              border: '1px solid rgba(133,100,4,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex', gap: '10px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1.4 }}>⚠️</span>
              <p style={{ fontSize: '13px', color: '#856404', lineHeight: 1.5, fontFamily: 'var(--font-body)', margin: 0 }}>
                Check that sand is not loose before driving on the beach — getting stuck happens occasionally. If sand is soft, park roadside and walk ~200 yards to the beach.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Crystal Beach */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ ...mono, marginBottom: '6px' }}>Crystal Beach</p>
            <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
              Approximately 10 minutes further down Hwy 87.
            </p>
          </div>
          <span style={{
            flexShrink: 0, whiteSpace: 'nowrap',
            fontSize: '11px', fontWeight: 700,
            color: 'var(--color-teal)', background: 'var(--color-teal-xlight)',
            padding: '3px 10px', borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-body)',
          }}>
            10 min farther
          </span>
        </div>
      </div>

    </div>
  )
}

const mono = {
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  fontWeight: 600,
}
