import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AnnouncementForm from '../components/announcements/AnnouncementForm'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7)   return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: new Date(ts).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
}

export default function Announcements() {
  const { isFamily } = useAuth()
  const navigate = useNavigate()

  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [expanded, setExpanded]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function togglePin(item) {
    await supabase.from('announcements').update({ pinned: !item.pinned }).eq('id', item.id)
    setItems((prev) => prev.map((a) => a.id === item.id ? { ...a, pinned: !item.pinned } : a)
      .sort((a, b) => (b.pinned - a.pinned) || (new Date(b.created_at) - new Date(a.created_at))))
  }

  async function handleDelete(id) {
    await supabase.from('announcements').delete().eq('id', id)
    setItems((prev) => prev.filter((a) => a.id !== id))
    setConfirmDel(null)
    setExpanded(null)
  }

  return (
    <main className="page" style={{ paddingTop: 0 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4d6b 55%, #1a5c6e 100%)',
        padding: 'calc(var(--safe-top) + 28px) 20px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <svg viewBox="0 0 375 60" preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60px', opacity: 0.10 }}>
          <path d="M0 30 Q94 0 188 30 Q282 60 375 30 L375 60 L0 60 Z" fill="white" />
        </svg>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute', top: 'calc(var(--safe-top) + 20px)', left: '16px',
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 1, color: 'white', fontSize: '18px',
          }}
          aria-label="Back"
        >
          ‹
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ paddingLeft: '28px' }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontFamily: 'var(--font-body)', marginBottom: '3px' }}>
              Phillips House
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}>
              Announcements
            </h1>
          </div>
          {isFamily && (
            <button
              onClick={() => { setEditItem(null); setShowForm(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--color-teal)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-full)',
                padding: '10px 18px', fontSize: '14px', fontWeight: 600,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1, fontWeight: 300 }}>+</span>
              Post
            </button>
          )}
        </div>
      </div>

      <div className="page-inner" style={{ paddingTop: '20px' }}>
        {loading ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <EmptyState onAdd={isFamily ? () => { setEditItem(null); setShowForm(true) } : null} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((item) => {
              const isOpen = expanded === item.id
              const isLong = item.body.length > 200

              return (
                <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                  {/* Pinned stripe */}
                  {item.pinned && (
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                      background: 'var(--color-coral)', borderRadius: '14px 0 0 14px',
                    }} />
                  )}

                  <div style={{ padding: '14px 16px 14px', paddingLeft: item.pinned ? '20px' : '16px' }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      {item.pinned && (
                        <span style={{
                          fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
                          background: 'var(--color-coral)', color: 'white',
                          padding: '2px 7px', borderRadius: 'var(--radius-full)',
                          textTransform: 'uppercase', marginTop: '3px', flexShrink: 0,
                        }}>Pinned</span>
                      )}
                      <h3 style={{
                        fontFamily: 'var(--font-display)', fontSize: '17px',
                        fontWeight: 600, color: 'var(--color-navy)', lineHeight: 1.3, flex: 1,
                      }}>
                        {item.title}
                      </h3>
                    </div>

                    {/* Body */}
                    <p style={{
                      fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6,
                      marginBottom: '8px',
                      display: '-webkit-box', WebkitLineClamp: isOpen ? 'unset' : 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: isOpen ? 'visible' : (isLong ? 'hidden' : 'visible'),
                    }}>
                      {item.body}
                    </p>

                    {/* Read more / less */}
                    {isLong && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : item.id)}
                        style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '8px' }}
                      >
                        {isOpen ? 'Show less' : 'Read more'}
                      </button>
                    )}

                    {/* Meta */}
                    <p style={{ fontSize: '11px', color: 'var(--color-sand-400)', marginBottom: isFamily ? '10px' : 0 }}>
                      {item.author_name ?? 'Phillips House'} · {timeAgo(item.created_at)}
                    </p>

                    {/* Actions */}
                    {isFamily && (
                      confirmDel === item.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>Delete this announcement?</span>
                          <button onClick={() => handleDelete(item.id)} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Delete</button>
                          <button onClick={() => setConfirmDel(null)} style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', minHeight: '32px' }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                          <button onClick={() => togglePin(item)} style={{ ...actionBtn, color: item.pinned ? 'var(--color-coral)' : 'var(--color-text-muted)' }}>
                            {item.pinned ? '📌 Unpin' : '📌 Pin'}
                          </button>
                          <button onClick={() => { setEditItem(item); setShowForm(true) }} style={actionBtn}>Edit</button>
                          <button onClick={() => setConfirmDel(item.id)} style={{ ...actionBtn, color: 'var(--color-coral)' }}>Delete</button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <AnnouncementForm
          announcement={editItem}
          onSave={() => { setShowForm(false); setEditItem(null); fetchItems() }}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}
    </main>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📢</div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-navy)', marginBottom: '8px' }}>
        No announcements yet
      </p>
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Post updates for the whole family here.
      </p>
      {onAdd && (
        <button onClick={onAdd} className="btn btn-teal">+ Post Announcement</button>
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ opacity: 1 - i * 0.2 }}>
          <div style={{ height: 18, width: '60%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 10 }} />
          <div style={{ height: 13, width: '100%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 13, width: '85%', background: 'var(--color-sand-100)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 11, width: '30%', background: 'var(--color-sand-100)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

const actionBtn = {
  fontSize: '13px', fontWeight: 500, color: 'var(--color-navy)',
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: '32px',
}
