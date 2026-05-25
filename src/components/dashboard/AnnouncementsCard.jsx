import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AnnouncementsCard() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('announcements')
      .select('id, title, body, pinned, created_at, author_name')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={headingStyle}>Announcements</h3>
        <button
          onClick={() => navigate('/announcements')}
          style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          See all →
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ height: 14, width: '70%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
              <div style={{ height: 12, width: '90%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
              <div style={{ height: 12, width: '50%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          No announcements yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{
                paddingBottom: i < items.length - 1 ? '14px' : 0,
                marginBottom: i < items.length - 1 ? '14px' : 0,
                borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                {item.pinned && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.4px',
                    background: 'var(--color-coral)', color: 'white',
                    padding: '2px 7px', borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase',
                  }}>
                    Pinned
                  </span>
                )}
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                  {item.title}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '5px' }}>
                {item.body.length > 120 ? item.body.slice(0, 120) + '…' : item.body}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-sand-400)' }}>
                {item.author_name ?? 'Phillips House'} · {timeAgo(item.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const headingStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '17px',
  fontWeight: 600,
  color: 'var(--color-navy)',
}
