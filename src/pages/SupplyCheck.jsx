import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_OPTIONS = [
  { value: 'good', label: 'Good',         color: '#2ab8c4', bg: '#e0f7fa' },
  { value: 'low',  label: 'Running Low',  color: '#b8860b', bg: '#fff8e1' },
  { value: 'out',  label: 'Out',          color: '#e8745a', bg: '#fdecea' },
]

export default function SupplyCheck() {
  const [searchParams] = useSearchParams()
  const itemId = searchParams.get('item')

  const [supplies, setSupplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [reporterName, setReporterName] = useState('')
  const [updates, setUpdates] = useState({})   // { [id]: status }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      let query = supabase.from('supplies').select('*').order('category').order('name')
      if (itemId) query = query.eq('id', itemId)
      const { data, error } = await query
      if (error) { setError('Could not load supplies.'); setLoading(false); return }
      setSupplies(data ?? [])
      setLoading(false)
    }
    load()
  }, [itemId])

  function setStatus(id, status) {
    setUpdates((prev) => ({ ...prev, [id]: status }))
  }

  async function handleSubmit() {
    const changed = Object.entries(updates)
    if (changed.length === 0) { setError('No changes to submit.'); return }

    setSaving(true)
    setError(null)

    const name = reporterName.trim() || 'Anonymous'
    const now = new Date().toISOString()

    for (const [id, status] of changed) {
      const { error: err } = await supabase
        .from('supplies')
        .update({ status, last_updated_by: name, updated_at: now })
        .eq('id', id)
      if (err) { setError('Save failed: ' + err.message); setSaving(false); return }
    }

    setSaving(false)
    setSaved(true)
  }

  if (saved) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', background: 'var(--color-sand-50)', textAlign: 'center' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--color-navy)', marginBottom: '8px' }}>
          Thanks!
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>
          Supply status updated. The family will take care of the rest.
        </p>
      </div>
    )
  }

  const grouped = supplies.reduce((acc, s) => {
    acc[s.category] = acc[s.category] ?? []
    acc[s.category].push(s)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-sand-50)', paddingBottom: '32px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4d6b 55%, #1a5c6e 100%)',
        padding: '48px 20px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <svg viewBox="0 0 375 60" preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60px', opacity: 0.10 }}>
          <path d="M0 30 Q94 0 188 30 Q282 60 375 30 L375 60 L0 60 Z" fill="white" />
        </svg>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontFamily: 'var(--font-body)', marginBottom: '4px', position: 'relative' }}>
          Phillips Beach House
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '26px', fontWeight: 700, position: 'relative', marginBottom: '6px' }}>
          {itemId ? 'Supply Check' : 'Supply Check'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontFamily: 'var(--font-body)', position: 'relative' }}>
          Let us know what's running low or out.
        </p>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Reporter name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Your name (optional)</label>
          <input
            type="text"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="e.g. Kelly"
            style={inputStyle}
          />
        </div>

        {loading ? (
          <SkeletonList />
        ) : error && supplies.length === 0 ? (
          <p style={{ color: 'var(--color-coral)', fontSize: '14px' }}>{error}</p>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                {category}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((s) => {
                  const current = updates[s.id] ?? s.status
                  return (
                    <div key={s.id} className="card" style={{ padding: '12px 14px' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--color-navy)', marginBottom: '10px' }}>
                        {s.name}
                      </p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setStatus(s.id, opt.value)}
                            style={{
                              flex: 1,
                              height: '36px',
                              borderRadius: 'var(--radius-full)',
                              border: current === opt.value ? 'none' : '1.5px solid var(--color-border)',
                              background: current === opt.value ? opt.bg : 'transparent',
                              color: current === opt.value ? opt.color : 'var(--color-text-muted)',
                              fontSize: '12px',
                              fontWeight: current === opt.value ? 700 : 400,
                              fontFamily: 'var(--font-body)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {error && (
          <p style={{ fontSize: '13px', color: 'var(--color-coral)', marginBottom: '12px' }}>{error}</p>
        )}

        {!loading && supplies.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={saving || Object.keys(updates).length === 0}
            className="btn btn-primary"
            style={{ width: '100%', height: '52px', fontSize: '16px', fontWeight: 600, marginTop: '8px' }}
          >
            {saving ? 'Saving…' : `Submit${Object.keys(updates).length > 0 ? ` (${Object.keys(updates).length} change${Object.keys(updates).length > 1 ? 's' : ''})` : ''}`}
          </button>
        )}
      </div>
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card" style={{ padding: '12px 14px', opacity: 1 - i * 0.15 }}>
          <div style={{ height: 16, width: '45%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 10 }} />
          <div style={{ height: 36, background: 'var(--color-sand-100)', borderRadius: 20 }} />
        </div>
      ))}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  letterSpacing: '0.4px',
  textTransform: 'uppercase',
  marginBottom: '6px',
  fontFamily: 'var(--font-body)',
}

const inputStyle = {
  width: '100%',
  height: '44px',
  padding: '0 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--color-border)',
  background: 'white',
  fontFamily: 'var(--font-body)',
  fontSize: '15px',
  color: 'var(--color-text)',
  outline: 'none',
  boxSizing: 'border-box',
}
