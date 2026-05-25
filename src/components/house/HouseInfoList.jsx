import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const SECTION_ICONS = {
  Access:    '🔑',
  WiFi:      '📶',
  Utilities: '⚡',
  Rules:     '📋',
}

export default function HouseInfoList() {
  const { isFamily } = useAuth()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState({})   // { [id]: bool }
  const [editing, setEditing]   = useState(null) // id being edited
  const [editVal, setEditVal]   = useState('')
  const [saving, setSaving]     = useState(false)
  const inputRef = useRef(null)

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('house_info')
      .select('*')
      .order('section')
      .order('sort_order')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  function startEdit(item) {
    setEditing(item.id)
    setEditVal(item.value)
  }

  async function saveEdit(id) {
    setSaving(true)
    await supabase.from('house_info').update({ value: editVal }).eq('id', id)
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, value: editVal } : i))
    setEditing(null)
    setSaving(false)
  }

  function cancelEdit() {
    setEditing(null)
    setEditVal('')
  }

  const grouped = items.reduce((acc, i) => {
    acc[i.section] = acc[i.section] ?? []
    acc[i.section].push(i)
    return acc
  }, {})

  if (loading) return <SkeletonList />

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
        No house info yet. Ask your admin to fill it in.
      </div>
    )
  }

  return (
    <div>
      {Object.entries(grouped).map(([section, sectionItems]) => (
        <div key={section} style={{ marginBottom: '20px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
            textTransform: 'uppercase', color: 'var(--color-text-muted)',
            marginBottom: '8px', fontFamily: 'var(--font-body)',
          }}>
            {SECTION_ICONS[section] ?? '📌'} {section}
          </p>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {sectionItems.map((item, i) => {
              const isLast    = i === sectionItems.length - 1
              const isRevealed = revealed[item.id]
              const isEditing  = editing === item.id
              const isEmpty    = !item.value.trim()

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  {/* Label row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <p style={{
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px',
                      textTransform: 'uppercase', color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {item.label}
                      {item.sensitive && !isFamily && (
                        <span style={{ marginLeft: '6px', fontSize: '9px', background: 'var(--color-teal-xlight)', color: 'var(--color-teal)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                          WIFI VISIBLE
                        </span>
                      )}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Reveal toggle for sensitive items */}
                      {item.sensitive && !isEditing && (
                        <button
                          onClick={() => setRevealed((r) => ({ ...r, [item.id]: !r[item.id] }))}
                          style={{
                            fontSize: '11px', fontWeight: 600,
                            color: 'var(--color-teal)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '2px 0', fontFamily: 'var(--font-body)',
                          }}
                        >
                          {isRevealed ? 'Hide' : 'Reveal'}
                        </button>
                      )}
                      {/* Edit button for family/admin */}
                      {isFamily && !isEditing && (
                        <button
                          onClick={() => startEdit(item)}
                          style={{
                            fontSize: '11px', fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '2px 0', fontFamily: 'var(--font-body)',
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Value */}
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <input
                        ref={inputRef}
                        type={item.sensitive ? 'text' : 'text'}
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit() }}
                        style={{
                          flex: 1, height: '36px', padding: '0 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--color-teal)',
                          background: 'white', fontFamily: 'var(--font-mono)',
                          fontSize: '14px', color: 'var(--color-navy)',
                          outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={() => saveEdit(item.id)}
                        disabled={saving}
                        style={{
                          height: '36px', padding: '0 14px',
                          background: 'var(--color-teal)', color: 'white',
                          border: 'none', borderRadius: 'var(--radius-sm)',
                          fontSize: '13px', fontWeight: 600,
                          fontFamily: 'var(--font-body)', cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {saving ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{
                          height: '36px', padding: '0 10px',
                          background: 'none', color: 'var(--color-text-muted)',
                          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                          fontSize: '13px', fontFamily: 'var(--font-body)', cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <p style={{
                      fontFamily: item.sensitive ? 'var(--font-mono)' : 'var(--font-body)',
                      fontSize: '15px',
                      fontWeight: item.sensitive ? 600 : 400,
                      color: isEmpty ? 'var(--color-text-muted)' : 'var(--color-navy)',
                      letterSpacing: item.sensitive && !isRevealed ? '2px' : 'normal',
                      fontStyle: isEmpty ? 'italic' : 'normal',
                      userSelect: isRevealed ? 'text' : 'none',
                      WebkitUserSelect: isRevealed ? 'text' : 'none',
                    }}>
                      {isEmpty
                        ? (isFamily ? 'Tap Edit to set a value' : '—')
                        : item.sensitive && !isRevealed
                          ? '●●●●●●●●'
                          : item.value
                      }
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {isFamily && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '8px', marginBottom: '8px' }}>
          Tap <strong>Edit</strong> next to any value to update it.
        </p>
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[4, 2, 2].map((count, si) => (
        <div key={si}>
          <div style={{ height: 11, width: '20%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 8 }} />
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: i < count - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ height: 10, width: '25%', background: 'var(--color-sand-100)', borderRadius: 3, marginBottom: 6 }} />
                <div style={{ height: 15, width: '55%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
