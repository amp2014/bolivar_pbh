import { useEffect, useState } from 'react'
import { useLayout } from '../../contexts/LayoutContext'

export default function WhatsNewModal({ data, onDismiss }) {
  const { isDesktop } = useLayout()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function renderContent(text) {
    return text.split('\n').filter(Boolean).map((line, i) => (
      <p key={i} style={{
        fontSize: '14px',
        color: line.startsWith('•') || line.startsWith('-') ? 'var(--color-text)' : 'var(--color-text-muted)',
        lineHeight: 1.6,
        marginBottom: '6px',
        fontFamily: 'var(--font-body)',
      }}>
        {line}
      </p>
    ))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: isDesktop ? 'center' : 'flex-end',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'white',
        borderRadius: isDesktop ? '20px' : '20px 20px 0 0',
        width: isDesktop ? 'min(480px, calc(100vw - 32px))' : '100%',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transform: visible
          ? (isDesktop ? 'scale(1)' : 'translateY(0)')
          : (isDesktop ? 'scale(0.95)' : 'translateY(100%)'),
        transition: 'opacity 0.32s, transform 0.32s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4d6b 55%, #1a5c6e 100%)',
          padding: '28px 24px 24px',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.6)', fontSize: '12px',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.8px',
            textTransform: 'uppercase', marginBottom: '6px',
          }}>
            What's New
          </p>
          <h2 style={{
            color: 'white', fontFamily: 'var(--font-display)',
            fontSize: '24px', fontWeight: 700, lineHeight: 1.2,
          }}>
            {data.title}
          </h2>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px 8px' }}>
          {renderContent(data.content)}
        </div>

        {/* Dismiss */}
        <div style={{
          padding: '12px 24px',
          paddingBottom: isDesktop ? '24px' : 'calc(16px + var(--safe-bottom, 0px))',
        }}>
          <button
            onClick={onDismiss}
            className="btn btn-primary"
            style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600 }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
