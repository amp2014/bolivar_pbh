import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import LocalFavoriteForm from './LocalFavoriteForm'

const CATEGORY_ICONS = {
  Restaurant: '🍽️',
  Fishing:    '🎣',
  Nature:     '🌿',
  Beach:      '🏖️',
  Shopping:   '🛒',
  'Day Trip': '🚗',
  Bar:        '🍹',
  Activity:   '🎯',
  Other:      '📍',
}

export default function LocalFavorites() {
  const { isFamily } = useAuth()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [filterCat, setFilterCat]  = useState('All')

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('local_favorites').select('*').order('category').order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function handleDelete(id) {
    await supabase.from('local_favorites').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setConfirmDel(null)
    setExpanded(null)
  }

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category))).sort()]
  const filtered = filterCat === 'All' ? items : items.filter((i) => i.category === filterCat)
  const grouped = filtered.reduce((acc, i) => {
    acc[i.category] = acc[i.category] ?? []
    acc[i.category].push(i)
    return acc
  }, {})

  return (
    <div>
      {/* Search row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{items.length} places</p>
        {isFamily && (
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            style={{
              height: '36px', padding: '0 16px',
              background: 'var(--color-teal)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-full)',
              fontSize: '13px', fontWeight: 600,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1, fontWeight: 300 }}>+</span>
            Add
          </button>
        )}
      </div>

      {/* Category chips */}
      {categories.length > 2 && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)} style={{
              height: '30px', padding: '0 14px',
              borderRadius: 'var(--radius-full)',
              border: filterCat === cat ? 'none' : '1px solid var(--color-border)',
              background: filterCat === cat ? 'var(--color-navy)' : 'white',
              color: filterCat === cat ? 'white' : 'var(--color-text-muted)',
              fontSize: '12px', fontWeight: filterCat === cat ? 600 : 400,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.15s',
            }}>
              {CATEGORY_ICONS[cat] ? `${CATEGORY_ICONS[cat]} ` : ''}{cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          No places yet.
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} style={{ marginBottom: '20px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
              textTransform: 'uppercase', color: 'var(--color-text-muted)',
              marginBottom: '8px', fontFamily: 'var(--font-body)',
            }}>
              {CATEGORY_ICONS[category] ?? '📍'} {category}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {catItems.map((item) => {
                const isOpen = expanded === item.id
                return (
                  <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : item.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between', gap: '8px',
                        padding: '12px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '2px' }}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: isOpen ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: isOpen ? 'visible' : 'hidden' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span style={{
                        color: 'var(--color-text-muted)', fontSize: '12px',
                        transition: 'transform 0.2s', display: 'inline-block',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        marginTop: '3px', flexShrink: 0,
                      }}>▾</span>
                    </button>

                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 14px', background: 'var(--color-sand-50)' }}>
                        {item.address && (
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            📍 {item.address}
                          </p>
                        )}
                        {item.phone && (
                          <a href={`tel:${item.phone}`} style={{ display: 'block', fontSize: '13px', color: 'var(--color-teal)', marginBottom: '4px', textDecoration: 'none', fontWeight: 500 }}>
                            📞 {item.phone}
                          </a>
                        )}
                        {item.website && (
                          <a href={item.website} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'block', fontSize: '13px', color: 'var(--color-teal)', marginBottom: '4px', textDecoration: 'none', fontWeight: 500, wordBreak: 'break-all' }}>
                            🔗 {item.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        {item.notes && (
                          <p style={{ fontSize: '13px', color: 'var(--color-text)', fontStyle: 'italic', marginTop: '4px', marginBottom: '4px' }}>
                            {item.notes}
                          </p>
                        )}

                        {isFamily && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                            {confirmDel === item.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>Remove this place?</span>
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
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <LocalFavoriteForm
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
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card" style={{ padding: '12px 14px', opacity: 1 - i * 0.15 }}>
          <div style={{ height: 15, width: '50%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 12, width: '80%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

const actionBtn = {
  fontSize: '13px', fontWeight: 500, color: 'var(--color-navy)',
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: '32px',
}
