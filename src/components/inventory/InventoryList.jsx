import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLayout } from '../../contexts/LayoutContext'
import InventoryForm from './InventoryForm'

const CONDITION_META = {
  good:         { label: 'Good',         color: 'var(--color-teal)',  bg: 'var(--color-teal-xlight)' },
  fair:         { label: 'Fair',          color: '#b8860b',           bg: '#fff8e1' },
  needs_repair: { label: 'Needs Repair',  color: 'var(--color-coral)',bg: '#fdecea' },
}

export default function InventoryList() {
  const { isDesktop } = useLayout()
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [expanded, setExpanded]   = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('inventory').select('*').order('category').order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function handleDelete(id) {
    await supabase.from('inventory').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setConfirmDel(null)
    setExpanded(null)
  }

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category))).sort()]

  const filtered = items.filter((i) => {
    const matchesCat = filterCat === 'All' || i.category === filterCat
    const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.location?.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const grouped = filtered.reduce((acc, i) => {
    acc[i.category] = acc[i.category] ?? []
    acc[i.category].push(i)
    return acc
  }, {})

  return (
    <div>
      {/* Search + Add row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          style={{
            flex: 1, height: '40px', padding: '0 14px',
            borderRadius: 'var(--radius-full)',
            border: '1.5px solid var(--color-border)',
            background: 'white', fontFamily: 'var(--font-body)',
            fontSize: '14px', color: 'var(--color-text)', outline: 'none',
          }}
        />
        <button
          onClick={() => { setEditItem(null); setShowForm(true) }}
          style={{
            height: '40px', padding: '0 16px',
            background: 'var(--color-teal)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: '20px', lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 300, flexShrink: 0,
          }}
          aria-label="Add item"
        >
          +
        </button>
      </div>

      {/* Category filter chips */}
      {categories.length > 2 && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                height: '30px', padding: '0 14px',
                borderRadius: 'var(--radius-full)',
                border: filterCat === cat ? 'none' : '1px solid var(--color-border)',
                background: filterCat === cat ? 'var(--color-navy)' : 'white',
                color: filterCat === cat ? 'white' : 'var(--color-text-muted)',
                fontSize: '12px', fontWeight: filterCat === cat ? 600 : 400,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          {search ? `No items matching "${search}"` : 'No items yet.'}
        </div>
      ) : isDesktop ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Name', 'Category', 'Condition', 'Location', 'Qty', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, background: 'var(--color-sand-50)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const meta = CONDITION_META[item.condition] ?? CONDITION_META.good
                return (
                  <tr key={item.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}>{item.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{item.category}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: meta.bg, color: meta.color, fontSize: '11px', fontWeight: 700 }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{item.location ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditItem(item); setShowForm(true) }} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-teal)', background: 'none', border: '1px solid var(--color-teal)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Edit</button>
                        <button onClick={() => setConfirmDel(item.id)} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: '1px solid var(--color-coral)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {confirmDel && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-sand-50)' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>Remove this item?</span>
              <button onClick={() => handleDelete(confirmDel)} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Delete</button>
              <button onClick={() => setConfirmDel(null)} style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Cancel</button>
            </div>
          )}
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} style={{ marginBottom: '20px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
              textTransform: 'uppercase', color: 'var(--color-text-muted)',
              marginBottom: '8px', fontFamily: 'var(--font-body)',
            }}>
              {category} <span style={{ fontWeight: 400, opacity: 0.6 }}>({catItems.length})</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {catItems.map((item) => {
                const meta = CONDITION_META[item.condition] ?? CONDITION_META.good
                const isOpen = expanded === item.id
                return (
                  <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Row */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : item.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: '8px',
                        padding: '10px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--color-navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                          {item.quantity > 1 && (
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '6px', fontWeight: 400 }}>×{item.quantity}</span>
                          )}
                        </p>
                        {item.location && (
                          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '1px' }}>{item.location}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 'var(--radius-full)',
                          background: meta.bg, color: meta.color,
                          fontSize: '11px', fontWeight: 700, letterSpacing: '0.2px',
                        }}>
                          {meta.label}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 14px', background: 'var(--color-sand-50)' }}>
                        {item.notes && (
                          <p style={{ fontSize: '13px', color: 'var(--color-text)', marginBottom: '10px', fontStyle: 'italic' }}>
                            {item.notes}
                          </p>
                        )}
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                          Added {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>

                        {confirmDel === item.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>Remove this item?</span>
                            <button onClick={() => handleDelete(item.id)} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Delete</button>
                            <button onClick={() => setConfirmDel(null)} style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <button onClick={() => { setEditItem(item); setShowForm(true) }} style={actionBtn}>Edit</button>
                            <button onClick={() => setConfirmDel(item.id)} style={{ ...actionBtn, color: 'var(--color-coral)' }}>Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <InventoryForm
          item={editItem}
          onSave={() => { setShowForm(false); setEditItem(null); fetchItems() }}
          onClose={() => { setShowForm(false); setEditItem(null) }}
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
            <div>
              <div style={{ height: 14, width: '45%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 5 }} />
              <div style={{ height: 11, width: '28%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
            </div>
            <div style={{ height: 22, width: '18%', background: 'var(--color-sand-100)', borderRadius: 20 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const actionBtn = {
  fontSize: '13px', fontWeight: 500, color: 'var(--color-navy)',
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: '32px',
}
