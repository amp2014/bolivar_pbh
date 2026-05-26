import { useState, useEffect, useRef } from 'react'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FunFactCard({ facts }) {
  const [current, setCurrent] = useState(null)
  const [visible, setVisible]  = useState(true)
  const queueRef = useRef([])

  function dequeue() {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffleArray(facts)
    }
    return queueRef.current.pop() ?? null
  }

  function advance() {
    setVisible(false)
    setTimeout(() => {
      setCurrent(dequeue())
      setVisible(true)
    }, 400)
  }

  useEffect(() => {
    if (facts.length === 0) return
    queueRef.current = shuffleArray(facts)
    setCurrent(queueRef.current.pop())
    setVisible(true)
    const timer = setInterval(advance, 30_000)
    return () => clearInterval(timer)
  }, [facts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Skeleton — shown briefly while facts load
  if (!current) {
    return (
      <div style={cardBase}>
        <div style={{ height: 10, width: '28%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 10 }} />
        <div style={{ height: 14, width: '95%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 14, width: '78%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 14, width: '60%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
      </div>
    )
  }

  return (
    // TODO V2: open long_fact modal
    <div
      onClick={() => console.log('expand fact', current.id)}
      style={{
        ...cardBase,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Label */}
      <p style={{
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        Did you know?
      </p>

      {/* Fact text */}
      <p style={{
        fontSize: '15px',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text)',
        lineHeight: 1.55,
        marginBottom: '12px',
      }}>
        {current.short_fact}
      </p>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-muted)',
          textTransform: 'lowercase',
          letterSpacing: '0.3px',
        }}>
          {current.category ?? ''}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {current.area && (
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              background: 'var(--color-teal-xlight)',
              color: 'var(--color-teal)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}>
              {current.area}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); advance() }}
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: 'var(--color-teal)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            next →
          </button>
        </div>
      </div>
    </div>
  )
}

const cardBase = {
  background: '#FDFAF4',
  borderTop: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)',
  borderBottom: '1px solid var(--color-border)',
  borderLeft: '3px solid #4AABB5',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
  padding: '14px 16px',
  minHeight: '80px',
  marginBottom: '12px',
  cursor: 'default',
}
