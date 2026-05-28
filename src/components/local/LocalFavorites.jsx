import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import LocalFavoriteForm from './LocalFavoriteForm'
import { formatPhone, rawPhone } from '../../lib/phone'

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

const AREA_OPTIONS = ['All', 'Bolivar', 'Crystal Beach', 'Galveston']

const AREA_BADGE = {
  Bolivar:         { background: 'rgba(42,184,196,0.15)', color: 'var(--color-teal)' },
  'Crystal Beach': { background: 'rgba(39,179,152,0.12)', color: '#1a8a7a' },
  Galveston:       { background: 'rgba(27,107,138,0.12)', color: '#1B6B8A' },
  Other:           { background: 'var(--color-sand-100)',  color: 'var(--color-text-muted)' },
}

function pillStyle(active) {
  return {
    height: '30px', padding: '0 14px',
    borderRadius: 'var(--radius-full)',
    border: active ? 'none' : '1px solid var(--color-teal)',
    background: active ? 'var(--color-teal)' : 'white',
    color: active ? 'white' : 'var(--color-teal)',
    fontSize: '12px', fontWeight: active ? 600 : 400,
    fontFamily: 'var(--font-body)', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
    transition: 'all 0.15s',
  }
}

export default function LocalFavorites() {
  const { isFamily } = useAuth()
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [filterCat,  setFilterCat]  = useState('All')
  const [filterArea, setFilterArea] = useState('All')

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

  const filtered = items.filter((i) => {
    const areaMatch = filterArea === 'All' || i.location_area === filterArea
    const catMatch  = filterCat  === 'All' || i.category      === filterCat
    return areaMatch && catMatch
  })

  const grouped = filtered.reduce((acc, i) => {
    acc[i.category] = acc[i.category] ?? []
    acc[i.category].push(i)
    return acc
  }, {})

  return (
    <div>
      {/* Header row */}
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

      {/* Area filter */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '2px', scrollbarWidth: 'none' }}>
        {AREA_OPTIONS.map((area) => (
          <button key={area} onClick={() => setFilterArea(area)} style={pillStyle(filterArea === area)}>
            {area}
          </button>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 2 && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)} style={pillStyle(filterCat === cat)}>
              {CATEGORY_ICONS[cat] ? `${CATEGORY_ICONS[cat]} ` : ''}{cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          No places found.
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
                const isOpen     = expanded === item.id
                const badgeStyle = AREA_BADGE[item.location_area] ?? AREA_BADGE.Other
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

                      {/* Right side: chevron + area badge */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
                        <span style={{
                          color: 'var(--color-text-muted)', fontSize: '12px',
                          transition: 'transform 0.2s', display: 'inline-block',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}>▾</span>
                        {item.location_area && (
                          <span style={{
                            ...badgeStyle,
                            fontSize: '10px', fontWeight: 600, letterSpacing: '0.2px',
                            padding: '2px 7px', borderRadius: 'var(--radius-full)',
                            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                          }}>
                            {item.location_area}
                          </span>
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 14px', background: 'var(--color-sand-50)' }}>
                        {item.address && (
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            📍 {item.address}
                          </p>
                        )}
                        {item.phone && (
                          <a href={`tel:${rawPhone(item.phone)}`} style={{ display: 'block', fontSize: '13px', color: 'var(--color-teal)', marginBottom: '4px', textDecoration: 'none', fontWeight: 500 }}>
                            📞 {formatPhone(item.phone)}
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
