import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import EmergencyContactForm from '../components/emergency/EmergencyContactForm'

const CATEGORY_ICONS = {
  'Emergency Services': '🚨',
  'Medical':            '🏥',
  'Utilities':          '⚡',
  'House Contacts':     '🏠',
}

const CATEGORY_ORDER = ['Emergency Services', 'Medical', 'Utilities', 'House Contacts']

export default function Emergency() {
  const navigate = useNavigate()
  const { isFamily } = useAuth()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('category')
      .order('sort_order')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const grouped = items.reduce((acc, i) => {
    acc[i.category] = acc[i.category] ?? []
    acc[i.category].push(i)
    return acc
  }, {})

  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped[c])

  return (
    <main className="page" style={{ paddingTop: 0 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4d6b 55%, #1a5c6e 100%)',
        padding: 'calc(var(--safe-top) + 28px) 20px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <svg viewBox="0 0 375 60" preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60px', opacity: 0.10 }}>
          <path d="M0 30 Q94 0 188 30 Q282 60 375 30 L375 60 L0 60 Z" fill="white" />
        </svg>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute', top: 'calc(var(--safe-top) + 20px)', left: '20px',
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
            color: 'white', fontSize: '18px', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 1,
          }}
          aria-label="Go back"
        >
          ‹
        </button>

        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontFamily: 'var(--font-body)', marginBottom: '3px', position: 'relative' }}>
          604 Nelson Ave
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '28px', fontWeight: 700, lineHeight: 1.15, position: 'relative' }}>
          Emergency Info
        </h1>
      </div>

      <div className="page-inner" style={{ paddingTop: '16px' }}>

        {/* 911 CTA — always at top */}
        <a href="tel:911" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', height: '60px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-coral)', color: 'white',
          textDecoration: 'none', fontFamily: 'var(--font-body)',
          fontSize: '20px', fontWeight: 700, marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(230,85,85,0.30)',
          letterSpacing: '0.3px',
        }}>
          🚨 Call 911
        </a>

        {loading ? (
          <SkeletonList />
        ) : (
          orderedCategories.map((category) => (
            <div key={category} style={{ marginBottom: '20px' }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
                textTransform: 'uppercase', color: 'var(--color-text-muted)',
                marginBottom: '8px', fontFamily: 'var(--font-body)',
              }}>
                {CATEGORY_ICONS[category] ?? '📌'} {category}
              </p>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {grouped[category].map((item, i) => {
                  const isLast = i === grouped[category].length - 1
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)',
                          fontFamily: 'var(--font-body)',
                          marginBottom: item.notes ? '2px' : 0,
                        }}>
                          {item.name}
                        </p>
                        {item.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                            {item.notes}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {isFamily && (
                          <button
                            onClick={() => { setEditItem(item); setShowForm(true) }}
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
                        {item.phone ? (
                          <a
                            href={`tel:${item.phone}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center',
                              height: '34px', padding: '0 12px',
                              background: 'var(--color-teal-xlight)',
                              color: 'var(--color-teal)',
                              borderRadius: 'var(--radius-full)',
                              textDecoration: 'none',
                              fontSize: '13px', fontWeight: 600,
                              fontFamily: 'var(--font-mono)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.phone}
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            {isFamily ? 'Tap Edit to add' : 'No number'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {isFamily && !loading && (
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            style={{
              width: '100%', height: '44px',
              border: '1.5px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'none', color: 'var(--color-text-muted)',
              fontSize: '14px', fontFamily: 'var(--font-body)',
              cursor: 'pointer', marginTop: '4px',
            }}
          >
            + Add Contact
          </button>
        )}

        <div style={{ height: '40px' }} />
      </div>

      {showForm && (
        <EmergencyContactForm
          item={editItem}
          onSave={() => { setShowForm(false); setEditItem(null); fetchItems() }}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}
    </main>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {[2, 2, 2, 3].map((count, si) => (
        <div key={si}>
          <div style={{ height: 11, width: '22%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 8 }} />
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                borderBottom: i < count - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ height: 13, width: '130px', background: 'var(--color-sand-100)', borderRadius: 3, marginBottom: 5 }} />
                  <div style={{ height: 10, width: '90px', background: 'var(--color-sand-100)', borderRadius: 3 }} />
                </div>
                <div style={{ height: 34, width: '110px', background: 'var(--color-sand-100)', borderRadius: 20 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
