import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hrs   = Math.floor(mins / 60)
  const days  = Math.floor(hrs / 24)
  if (days >= 1)  return `${days} day${days !== 1 ? 's' : ''} ago`
  if (hrs >= 1)   return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  if (mins >= 1)  return `${mins} min${mins !== 1 ? 's' : ''} ago`
  return 'Just now'
}

export default function LatestCatchCard() {
  const { isFamily } = useAuth()
  const navigate     = useNavigate()
  const [catch_,  setCatch]  = useState(undefined) // undefined=loading, null=none
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFamily) { setLoading(false); return }
    supabase
      .from('fishing_catches')
      .select('id, species, caught_at, photo_url, hide_metadata, catcher:caught_by(display_name)')
      .not('photo_url', 'is', null)
      .order('caught_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setCatch(data ?? null)
        setLoading(false)
      })
      .catch(() => { setCatch(null); setLoading(false) })
  }, [isFamily])

  // Guests and loading→nothing
  if (!isFamily || loading || !catch_) return null

  const c = catch_

  return (
    <div>
      <p style={{
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        marginBottom: '10px',
      }}>
        Latest Catch
      </p>

      <button
        onClick={() => navigate('/fishing')}
        style={{
          width: '100%', padding: 0, background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          background: 'white',
        }}>
          {/* Hero photo */}
          <div style={{ position: 'relative', height: 180, background: '#e8f4f8', overflow: 'hidden' }}>
            <img
              src={c.photo_url}
              alt={c.species || 'catch'}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Info row */}
          <div style={{ padding: '10px 14px 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>
                {c.species || 'Unknown species'}
              </p>
              {!c.hide_metadata && c.catcher?.display_name && (
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                  Caught by {c.catcher.display_name}
                </p>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {timeAgo(c.caught_at)}
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}
