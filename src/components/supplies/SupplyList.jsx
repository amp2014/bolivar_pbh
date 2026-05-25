import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import SupplyForm from './SupplyForm'

const STATUS_META = {
  good: { label: 'Good', color: 'var(--color-teal)',  bg: 'var(--color-teal-xlight)' },
  low:  { label: 'Low',  color: '#b8860b',            bg: '#fff8e1' },
  out:  { label: 'Out',  color: 'var(--color-coral)', bg: '#fdecea' },
}

export default function SupplyList() {
  const [supplies, setSupplies] = useState([])
  const [loading, setLoading]   = useState(true)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [view, setView]         = useState('all') // 'all' | 'shopping'
  const [showForm, setShowForm] = useState(false)
  const [editSupply, setEditSupply] = useState(null)

  async function fetchSupplies() {
    setLoading(true)
    const { data } = await supabase.from('supplies').select('*').order('category').order('name')
    setSupplies(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSupplies() }, [])

  async function updateStatus(id, status) {
    setSaving(true)
    await supabase.from('supplies').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setSupplies((prev) => prev.map((s) => s.id === id ? { ...s, status } : s))
    setSaving(false)
    setEditId(null)
  }

  const shopping  = supplies.filter((s) => s.status === 'low' || s.status === 'out')
  const displayed = view === 'shopping' ? shopping : supplies

  const grouped = displayed.reduce((acc, s) => {
    acc[s.category] = acc[s.category] ?? []
    acc[s.category].push(s)
    return acc
  }, {})

  return (
    <div>
      {/* View toggle + Add button */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{
          flex: 1, display: 'flex', gap: '4px',
          background: 'var(--color-sand-100)',
          borderRadius: 'var(--radius-full)',
          padding: '4px',
        }}>
          {[['all', 'All Supplies'], ['shopping', `Low or Out${shopping.length > 0 ? ` (${shopping.length})` : ''}`]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                flex: 1, height: '36px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: view === v ? 'white' : 'transparent',
                color: view === v ? (v === 'shopping' && shopping.length > 0 ? 'var(--color-coral)' : 'var(--color-navy)') : 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: view === v ? 600 : 400,
                cursor: 'pointer',
                boxShadow: view === v ? 'var(--shadow-card)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setEditSupply(null); setShowForm(true) }}
          style={{
            height: '44px', padding: '0 16px',
            background: 'var(--color-teal)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: '20px', lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 300, flexShrink: 0,
          }}
          aria-label="Add supply"
        >
          +
        </button>
      </div>

      {loading ? (
        <SkeletonList />
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          {view === 'shopping' ? '🎉 Everything is stocked!' : 'No supplies found.'}
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '20px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
              textTransform: 'uppercase', color: 'var(--color-text-muted)',
              marginBottom: '8px', fontFamily: 'var(--font-body)',
            }}>
              {category}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {items.map((s) => {
                const meta = STATUS_META[s.status] ?? STATUS_META.good
                const isEditing = editId === s.id
                return (
                  <div key={s.id} className="card" style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--color-navy)', flex: 1 }}>
                        {s.name}
                      </span>

                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {Object.entries(STATUS_META).map(([val, m]) => (
                            <button
                              key={val}
                              onClick={() => updateStatus(s.id, val)}
                              disabled={saving}
                              style={{
                                height: '28px', padding: '0 10px',
                                borderRadius: 'var(--radius-full)',
                                border: s.status === val ? 'none' : '1px solid var(--color-border)',
                                background: s.status === val ? m.bg : 'transparent',
                                color: s.status === val ? m.color : 'var(--color-text-muted)',
                                fontSize: '11px', fontWeight: 600,
                                fontFamily: 'var(--font-body)', cursor: 'pointer',
                              }}
                            >
                              {m.label}
                            </button>
                          ))}
                          <button
                            onClick={() => setEditId(null)}
                            style={{ height: '28px', padding: '0 8px', border: 'none', background: 'none', color: 'var(--color-text-muted)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => setEditId(s.id)}
                            style={{
                              padding: '3px 10px', borderRadius: 'var(--radius-full)',
                              border: 'none', background: meta.bg,
                              color: meta.color, fontSize: '11px', fontWeight: 700,
                              fontFamily: 'var(--font-body)', cursor: 'pointer',
                              letterSpacing: '0.2px',
                            }}
                          >
                            {meta.label}
                          </button>
                          <button
                            onClick={() => { setEditSupply(s); setShowForm(true) }}
                            style={{
                              width: 28, height: 28, borderRadius: '50%',
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-sand-50)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-muted)',
                              flexShrink: 0,
                            }}
                            aria-label="Edit supply"
                          >
                            ✏
                          </button>
                        </div>
                      )}
                    </div>
                    {s.last_updated_by && (
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Updated by {s.last_updated_by}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <SupplyForm
          supply={editSupply}
          onSave={() => { setShowForm(false); setEditSupply(null); fetchSupplies() }}
          onClose={() => { setShowForm(false); setEditSupply(null) }}
        />
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="card" style={{ padding: '10px 14px', opacity: 1 - i * 0.1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ height: 14, width: '40%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
            <div style={{ height: 22, width: '18%', background: 'var(--color-sand-100)', borderRadius: 20 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
