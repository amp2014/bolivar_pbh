import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CurrentConditionsCard } from './TideBoard'
import CatchLogger from '../../components/fishing/CatchLogger'
import FishingSpots from '../../components/fishing/FishingSpots'
import BestTimeCard from '../../components/fishing/BestTimeCard'
import SolunarCard from '../../components/fishing/SolunarCard'
import RipCurrentBadge from '../../components/fishing/RipCurrentBadge'

function formatTime(date) {
  let h = date.getHours(), m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function ConditionsLine({ catch: c }) {
  if (c.hide_metadata) return null
  const parts = []
  if (c.tide_state)    parts.push(`${c.tide_state.charAt(0).toUpperCase() + c.tide_state.slice(1)} tide`)
  if (c.tide_height_ft != null) parts.push(`${c.tide_height_ft} ft`)
  if (c.water_temp_f  != null)  parts.push(`Water ${c.water_temp_f}°F`)
  if (!parts.length) return null
  return (
    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '2px 0 0' }}>
      {parts.join(' · ')}
    </p>
  )
}

export default function FishingHome() {
  const navigate               = useNavigate()
  const { user, isAdmin }      = useAuth()
  const [catches, setCatches]  = useState([])
  const [loading, setLoading]  = useState(true)
  const [showLogger, setLogger] = useState(false)

  async function loadCatches() {
    setLoading(true)
    const { data } = await supabase
      .from('fishing_catches')
      .select('*')
      .order('caught_at', { ascending: false })
      .limit(20)
    if (data) setCatches(data)
    setLoading(false)
  }

  useEffect(() => { loadCatches() }, [])

  async function deleteCatch(id) {
    if (!confirm('Delete this catch?')) return
    await supabase.from('fishing_catches').delete().eq('id', id)
    setCatches(prev => prev.filter(c => c.id !== id))
  }

  const canDelete = (c) => c.caught_by === user?.id || isAdmin

  if (showLogger) {
    return (
      <div style={{
        paddingTop: 'calc(var(--safe-top, 0px) + 20px)',
        paddingBottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom, 0px) + 24px)',
      }}>
        <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setLogger(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '14px', fontFamily: 'var(--font-body)' }}
          >
            ← Back
          </button>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--color-navy)', margin: 0 }}>
            Log a Catch
          </h2>
        </div>
        <CatchLogger
          onDone={() => { setLogger(false); loadCatches() }}
          onCancel={() => setLogger(false)}
        />
      </div>
    )
  }

  return (
    <div style={{
      paddingTop: 'calc(var(--safe-top, 0px) + 20px)',
      paddingBottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom, 0px) + 24px)',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700,
        color: 'var(--color-navy)', padding: '0 16px 16px', margin: 0,
      }}>
        Fishing
      </h1>

      {/* ── Best Time to Fish (headline card) ── */}
      <div style={{ padding: '0 16px 20px' }}>
        <BestTimeCard />
      </div>

      {/* ── Current tide summary + rip current ── */}
      <div style={{ padding: '0 16px 8px' }}>
        <CurrentConditionsCard onSeeAll={() => navigate('/fishing/tides')} />
      </div>
      <div style={{ padding: '0 16px 20px' }}>
        <RipCurrentBadge />
      </div>

      {/* ── Log Catch CTA ── */}
      <div style={{ padding: '0 16px 24px' }}>
        <button
          onClick={() => setLogger(true)}
          style={{
            width: '100%', height: '56px',
            background: 'var(--color-teal)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font-body)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          🎣 Log a Catch
        </button>
      </div>

      {/* ── Solunar Feeding Times ── */}
      <div style={{ padding: '0 16px 24px' }}>
        <SolunarCard />
      </div>

      {/* ── Fishing Spots + Catch Map link ── */}
      <div style={{ padding: '0 16px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <FishingSpots />
        <button
          onClick={() => navigate('/fishing/map')}
          style={{
            marginTop: '12px', width: '100%', height: '44px',
            background: 'transparent', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)',
            color: 'var(--color-navy)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          🗺 View Catch Map
        </button>
      </div>

      {/* ── Recent Catches ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <p style={{
          fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
          letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px',
        }}>
          Recent Catches
        </p>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: 70, borderRadius: 12,
                background: 'var(--color-sand-100)',
                animation: 'pbh-pulse 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : catches.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', textAlign: 'center', padding: '24px 0' }}>
            No catches yet — log the first one!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {catches.map(c => (
              <div key={c.id} style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                background: 'var(--color-sand-50, #fdfaf5)',
                border: '1px solid var(--color-border)', borderRadius: '14px', padding: '12px',
              }}>
                {c.photo_url && (
                  <img src={c.photo_url} alt={c.species || 'catch'}
                    style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>
                    {c.species || 'Unknown species'}
                  </p>
                  {!c.hide_metadata && (
                    <ConditionsLine catch={c} />
                  )}
                  {c.caption && (
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                      {c.caption}
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {c.caught_at ? new Date(c.caught_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </p>
                </div>
                {canDelete(c) && (
                  <button
                    onClick={() => deleteCatch(c.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-muted)', padding: '2px 4px', fontSize: '18px',
                      lineHeight: 1, flexShrink: 0,
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
