import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLayout } from '../../contexts/LayoutContext'
import SupplyForm from './SupplyForm'

const STATUS_META = {
  good: { label: 'Good', color: 'var(--color-teal)',  bg: 'var(--color-teal-xlight)' },
  low:  { label: 'Low',  color: '#b8860b',            bg: '#fff8e1' },
  out:  { label: 'Out',  color: 'var(--color-coral)', bg: '#fdecea' },
}

export default function SupplyList() {
  const { isDesktop } = useLayout()
  const [supplies, setSupplies] = useState([])
  const [loading, setLoading]   = useState(true)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [view, setView]         = useState('all') // 'all' | 'shopping'
  const [search, setSearch]     = useState('')
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

  const shopping   = supplies.filter((s) => s.status === 'low' || s.status === 'out')
  const viewBase   = view === 'shopping' ? shopping : supplies
  const searchTerm = search.trim().toLowerCase()
  const displayed  = searchTerm
    ? viewBase.filter((s) => s.name.toLowerCase().includes(searchTerm) || s.category.toLowerCase().includes(searchTerm))
    : viewBase

  const grouped = displayed.reduce((acc, s) => {
    acc[s.category] = acc[s.category] ?? []
    acc[s.category].push(s)
    return acc
  }, {})

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none', opacity: 0.5 }}>🔍</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search supplies…"
          style={{
            width: '100%', height: '40px', paddingLeft: '38px', paddingRight: search ? '36px' : '12px',
            borderRadius: 'var(--radius-full)', border: '1.5px solid var(--color-border)',
            background: 'var(--color-sand-50)', fontFamily: 'var(--font-body)',
            fontSize: '14px', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontSize: '18px', lineHeight: 1, padding: 0,
            }}
          >×</button>
        )}
      </div>

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
          {searchTerm ? `No results for "${search}"` : view === 'shopping' ? '🎉 Everything is stocked!' : 'No supplies found.'}
        </div>
      ) : isDesktop ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Name', 'Category', 'Status', 'Updated by', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, background: 'var(--color-sand-50)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((s, i) => {
                const meta = STATUS_META[s.status] ?? STATUS_META.good
                const isEditing = editId === s.id
                return (
                  <tr key={s.id} style={{ borderBottom: i < displayed.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>{s.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{s.category}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {Object.entries(STATUS_META).map(([val, m]) => (
                            <button key={val} onClick={() => updateStatus(s.id, val)} disabled={saving} style={{ height: '26px', padding: '0 10px', borderRadius: 'var(--radius-full)', border: s.status === val ? 'none' : '1px solid var(--color-border)', background: s.status === val ? m.bg : 'transparent', color: s.status === val ? m.color : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                              {m.label}
                            </button>
                          ))}
                          <button onClick={() => setEditId(null)} style={{ height: '26px', padding: '0 8px', border: 'none', background: 'none', color: 'var(--color-text-muted)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditId(s.id)} style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', border: 'none', background: meta.bg, color: meta.color, fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                          {meta.label}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{s.last_updated_by ?? '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button onClick={() => { setEditSupply(s); setShowForm(true) }} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-teal)', background: 'none', border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
